import { findWorkerInTabs } from '@/lib/workerSheetLookup';
import { supabase } from '@/integrations/supabase/client';
import {
  SPREADSHEET_ID,
  StageSheet,
  setActiveSpreadsheetId,
} from '@/lib/spreadsheetConfig';
import { normalizeStageToken, parseStageFromWorkerId } from '@/lib/workerIdStage';
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
export async function findStageSheet(workerId: string): Promise<string | null> {
  const all = await loadStageSheets();

  const defaultEnabled = isDefaultFallbackEnabled(all);
  const registry = getEnabledStageSheets(all);

  if (registry.length === 0) {
    if (defaultEnabled) {
      return SPREADSHEET_ID;
    }
    return null;
  }

  const parsedStage = parseStageFromWorkerId(workerId);
  const token = parsedStage ? normalizeStageToken(parsedStage) : null;
  const ordered = token
    ? [
        ...registry.filter((s) => normalizeStageToken(s.stage) === token),
        ...registry.filter((s) => normalizeStageToken(s.stage) !== token),
      ]
    : registry;

  const searches = await Promise.all(
    ordered.map(async (s) => {
      try {
        return { spreadsheetId: s.spreadsheetId, found: await sheetContainsWorker(s.spreadsheetId, workerId), error: null };
      } catch (error) {
        return { spreadsheetId: s.spreadsheetId, found: false, error: error instanceof Error ? error : new Error('Could not check a stage sheet.') };
      }
    }),
  );
  const stageSearches = token
    ? searches.filter((_, index) => normalizeStageToken(ordered[index]?.stage || '') === token)
    : [];
  const stageMatch = stageSearches.find(search => search.found)?.spreadsheetId;
  if (stageMatch) return stageMatch;
  // Do not silently route to another source if the worker's configured stage
  // could not be checked, even if the same ID occurs in another spreadsheet.
  const stageSearchError = stageSearches.find(search => search.error)?.error;
  if (stageSearchError) throw stageSearchError;
  const match = searches.find((search) => search.found)?.spreadsheetId || null;
  if (match) return match;
  const searchError = searches.find((search) => search.error)?.error;
  if (searchError) {
    throw searchError;
  }
  if (defaultEnabled) {
    return SPREADSHEET_ID;
  }
  // No match and the default sheet is disabled: block data loading rather
  // than silently reading the wrong file.
  return null;
}

/** Resolve and activate only for an established identity, never during login lookup. */
export async function resolveStageSheet(workerId: string): Promise<string | null> {
  setActiveSpreadsheetId('__unresolved__', workerId);
  const id = await findStageSheet(workerId);
  if (id) setActiveSpreadsheetId(id, workerId);
  return id;
}
