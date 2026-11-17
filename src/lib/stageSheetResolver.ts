import { findWorkerInTabs } from '@/lib/workerSheetLookup';
import { supabase } from '@/integrations/supabase/client';
import {
  SPREADSHEET_ID,
  StageSheet,
  setActiveSpreadsheetId,
} from '@/lib/spreadsheetConfig';
import { parseSourceStage, parseStageFromWorkerId, parseWorkerGeneration } from '@/lib/workerIdStage';
import {
  DEFAULT_SHEET_STAGE_KEY,
  getEnabledStageSheets,
  isDefaultFallbackEnabled,
} from '@/lib/stageSheetRegistry';

export { DEFAULT_SHEET_STAGE_KEY };

export async function loadStageSheets(): Promise<StageSheet[]> {
  const { data, error } = await supabase
    .from('admin_settings')
    .select('setting_value')
    .eq('setting_key', 'stage_spreadsheets')
    .maybeSingle();
  if (error) throw new Error('Could not load the stage sheet settings. Please try again later.');
  const list = (data?.setting_value as unknown as StageSheet[]) || [];
  return Array.isArray(list) ? list.filter((s) => s?.spreadsheetId) : [];
}

type SheetName = { name: string; disabled?: boolean };

async function fetchSheetNames(spreadsheetId: string): Promise<SheetName[]> {
  const { data: meta, error } = await supabase.functions.invoke('fetch-google-sheets', {
    body: { action: 'getSheets', spreadsheetId },
  });
  if (error) {
    const context = (error as { context?: Response }).context;
    let body: { error?: unknown } | null = null;
    try {
      body = await context?.json() ?? null;
    } catch { /* fall back to the function error */ }
    if (typeof body?.error === 'string') throw new Error(body.error);
    throw new Error(error.message || 'Could not open this Google Sheet. Check its link and sharing settings.');
  }
  if (typeof meta?.error === 'string') throw new Error(meta.error);
  return meta?.sheets || [];
}

/**
 * Order a stage file's tabs for the ID search. Stage bonus files name their
 * tabs differently, so no single naming convention is assumed: daily- and
 * performance-named tabs come first, then ranking, then everything else.
 */
function orderCandidateTabs(names: SheetName[]): string[] {
  const visible = names.filter((s) => !s.disabled).map((s) => s.name);
  const daily = visible.filter((n) => /DAILY|PERFORMANCE/i.test(n));
  const ranking = visible.filter(n => /RANKING/i.test(n));
  const rest = visible.filter((n) => !/DAILY|PERFORMANCE|RANKING/i.test(n));
  return [...daily, ...ranking, ...rest];
}

/** Check the selected spreadsheet without requiring a dated earnings record. */
export async function sheetContainsWorker(spreadsheetId: string, workerId: string): Promise<boolean> {
  const names = await fetchSheetNames(spreadsheetId);
  const candidates = orderCandidateTabs(names).map(name => ({ name }));
  return findWorkerInTabs(candidates, workerId, async (name) => {
    const { data, error } = await supabase.functions.invoke('fetch-google-sheets', {
      body: { action: 'getSheetData', spreadsheetId, sheetName: name },
    });
    if (error || typeof data?.error === 'string') throw new Error('Could not read this sheet tab.');
    if (!Array.isArray(data?.headers) || !Array.isArray(data?.rows) || !data.rows.every(Array.isArray)) {
      throw new Error('The sheet returned an invalid response.');
    }
    return [data.headers, ...data.rows];
  });
}

/**
 * Pick the spreadsheet holding this worker's bonuses. The worker's stage is
 * read from their ID format, so sheets whose tabs/headers never mention a
 * stage are still matched by ID. Stage-labelled entries are searched first;
 * every other enabled entry is searched afterwards as a safety net. Falls
 * back to the default sheet when enabled, otherwise returns null.
 */
type SheetResolution = { spreadsheetId: string; confirmed: boolean };

async function findStageSheetResolution(workerId: string): Promise<SheetResolution | null> {
  const all = await loadStageSheets();

  const defaultEnabled = isDefaultFallbackEnabled(all);
  const registry = getEnabledStageSheets(all);

  if (registry.length === 0) {
    if (defaultEnabled) {
      return { spreadsheetId: SPREADSHEET_ID, confirmed: false };
    }
    return null;
  }

  const parsedStage = parseStageFromWorkerId(workerId);
  const generation = parseWorkerGeneration(workerId);
  // Prefer the labelled stage, and within it a matching New/Old source or
  // unqualified source. An opposite-type source can still hold the ID.
  const priority = (source: StageSheet) => {
    const info = parseSourceStage(source.stage);
    if (!parsedStage || info?.stage !== parsedStage) return 3;
    if (!generation) return 0;
    if (info.generation === generation) return 0;
    return info.generation === null ? 1 : 2;
  };
  const ordered = [...registry].sort((a, b) => priority(a) - priority(b));
  const searches = await Promise.all(ordered.map(async (source) => {
    try {
      return { source, found: await sheetContainsWorker(source.spreadsheetId, workerId), error: null as Error | null };
    } catch (error) {
      return { source, found: false, error: error instanceof Error ? error : new Error('Could not check a stage sheet.') };
    }
  }));

  // A matching stage source that could not be checked must not silently fall
  // through to another source, even if the ID also occurs there.
  for (const level of parsedStage ? [0, 1, 2] : []) {
    const group = searches.filter(search => priority(search.source) === level);
    const failure = group.find(search => search.error)?.error;
    if (failure) throw failure;
    const match = group.find(search => search.found);
    if (match) return { spreadsheetId: match.source.spreadsheetId, confirmed: true };
  }
  const match = searches.find(search => search.found);
  if (match) return { spreadsheetId: match.source.spreadsheetId, confirmed: true };
  const failure = searches.find(search => search.error)?.error;
  if (failure) throw failure;
  if (defaultEnabled) {
    return { spreadsheetId: SPREADSHEET_ID, confirmed: false };
  }
  // No match and the default sheet is disabled: block data loading rather
  // than silently reading the wrong file.
  return null;
}

export async function findStageSheet(workerId: string): Promise<string | null> {
  return (await findStageSheetResolution(workerId))?.spreadsheetId ?? null;
}

/** Resolve and activate only for an established identity, never during login lookup. */
export async function resolveStageSheet(workerId: string): Promise<string | null> {
  setActiveSpreadsheetId('__unresolved__', workerId);
  const id = await findStageSheet(workerId);
  if (id) setActiveSpreadsheetId(id, workerId);
  return id;
}

/** Validate a newly entered ID without changing the active spreadsheet. */
export async function validateWorkerOnSheets(workerId: string): Promise<boolean> {
  const resolution = await findStageSheetResolution(workerId);
  if (!resolution) return false;
  // A registry match already proved presence. The default is an unchecked
  // routing fallback, so it must still be inspected before accepting the ID.
  return resolution.confirmed || sheetContainsWorker(resolution.spreadsheetId, workerId);
}
