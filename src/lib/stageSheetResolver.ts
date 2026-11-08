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

const norm = (v: string) => v.toUpperCase().replace(/\s+/g, '');

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

/** True when any cell of the searched tabs exactly equals the worker ID. */
async function sheetContainsWorker(spreadsheetId: string, workerId: string): Promise<boolean> {
  const names = await fetchSheetNames(spreadsheetId);
  const candidates = orderCandidateTabs(names);
  const target = norm(workerId);
  for (const name of candidates) {
    try {
      const { data, error } = await supabase.functions.invoke('fetch-google-sheets', {
        body: { action: 'getSheetData', spreadsheetId, sheetName: name },
      });
      if (error) throw new Error(error.message || `Could not read the ${name} tab.`);
      if (typeof data?.error === 'string') throw new Error(data.error);
      const rows: unknown[][] = [data?.headers || [], ...(data?.rows || [])];
      if (rows.some((r) => r.some((c) => norm(String(c ?? '')) === target))) return true;
    } catch (error) {
      throw error instanceof Error ? error : new Error('Could not read a tab in this stage sheet.');
    }
  }
  return false;
}

/**
 * Pick the spreadsheet holding this worker's bonuses. The worker's stage is
 * read from their ID format, so sheets whose tabs/headers never mention a
 * stage are still matched by ID. Stage-labelled entries are searched first;
 * every other enabled entry is searched afterwards as a safety net. Falls
 * back to the default sheet when enabled, otherwise returns null.
 */
export async function resolveStageSheet(workerId: string): Promise<string | null> {
  setActiveSpreadsheetId('__unresolved__', workerId);
  const all = await loadStageSheets();

  const defaultEnabled = isDefaultFallbackEnabled(all);
  const registry = getEnabledStageSheets(all);

  if (registry.length === 0) {
    if (defaultEnabled) {
      setActiveSpreadsheetId(null);
      return SPREADSHEET_ID;
    }
    setActiveSpreadsheetId('__unresolved__', workerId);
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
  const match = searches.find((search) => search.found)?.spreadsheetId || null;
  if (match) {
    setActiveSpreadsheetId(match, workerId);
    return match;
  }
  const stageSearchError = token
    ? searches.find((search, index) => normalizeStageToken(ordered[index]?.stage || '') === token && search.error)?.error
    : undefined;
  const searchError = stageSearchError || searches.find((search) => search.error)?.error;
  if (searchError) {
    setActiveSpreadsheetId('__unresolved__', workerId);
    throw searchError;
  }
  if (defaultEnabled) {
    setActiveSpreadsheetId(null);
    return SPREADSHEET_ID;
  }
  // No match and the default sheet is disabled: block data loading rather
  // than silently reading the wrong file.
  setActiveSpreadsheetId('__unresolved__', workerId);
  return null;
}
