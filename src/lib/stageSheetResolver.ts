import { supabase } from '@/integrations/supabase/client';
import {
  SPREADSHEET_ID,
  StageSheet,
  getStoredStageSheetFor,
  setActiveSpreadsheetId,
} from '@/lib/spreadsheetConfig';
import { normalizeStageToken, parseStageFromWorkerId } from '@/lib/workerIdStage';

/** Special registry entry that toggles the default sheet as a fallback. */
export const DEFAULT_SHEET_STAGE_KEY = '__default__';

export async function loadStageSheets(): Promise<StageSheet[]> {
  const { data } = await supabase
    .from('admin_settings')
    .select('setting_value')
    .eq('setting_key', 'stage_spreadsheets')
    .maybeSingle();
  const list = (data?.setting_value as unknown as StageSheet[]) || [];
  return Array.isArray(list) ? list.filter((s) => s?.spreadsheetId) : [];
}

/** False only when an admin explicitly disabled the default sheet as fallback. */
export function isDefaultFallbackEnabled(registry: StageSheet[]): boolean {
  const def = registry.find((s) => normalizeStageToken(s.stage) === DEFAULT_SHEET_STAGE_KEY);
  return def ? def.enabled : true;
}

const norm = (v: string) => v.toUpperCase().replace(/\s+/g, '');

type SheetName = { name: string; disabled?: boolean };

async function fetchSheetNames(spreadsheetId: string): Promise<SheetName[]> {
  const { data: meta, error } = await supabase.functions.invoke('fetch-google-sheets', {
    body: { action: 'getSheets', spreadsheetId },
  });
  if (error) throw new Error('getSheets failed');
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
  return [...daily.slice(0, 5), ...ranking.slice(0, 1), ...rest.slice(0, 4)];
}

/** True when any cell of the searched tabs exactly equals the worker ID. */
async function sheetContainsWorker(spreadsheetId: string, workerId: string): Promise<boolean> {
  const names = await fetchSheetNames(spreadsheetId).catch(() => [] as SheetName[]);
  const candidates = orderCandidateTabs(names);
  const target = norm(workerId);
  for (const name of candidates) {
    try {
      const { data } = await supabase.functions.invoke('fetch-google-sheets', {
        body: { action: 'getSheetData', spreadsheetId, sheetName: name },
      });
      const rows: unknown[][] = [data?.headers || [], ...(data?.rows || [])];
      if (rows.some((r) => r.some((c) => norm(String(c ?? '')) === target))) return true;
    } catch { /* try next tab */ }
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
  const stored = getStoredStageSheetFor(workerId);
  let all: StageSheet[] = [];
  try { all = await loadStageSheets(); } catch { /* fallback */ }

  const defaultEnabled = isDefaultFallbackEnabled(all);
  const registry = all.filter(
    (s) => s.enabled && s.spreadsheetId &&
      normalizeStageToken(s.stage) !== DEFAULT_SHEET_STAGE_KEY,
  );

  if (registry.length === 0) {
    setActiveSpreadsheetId(null);
    return defaultEnabled ? SPREADSHEET_ID : null;
  }
  if (stored && registry.some((s) => s.spreadsheetId === stored)) {
    setActiveSpreadsheetId(stored, workerId);
    return stored;
  }

  const parsedStage = parseStageFromWorkerId(workerId);
  const token = parsedStage ? normalizeStageToken(parsedStage) : null;
  const ordered = token
    ? [
        ...registry.filter((s) => normalizeStageToken(s.stage) === token),
        ...registry.filter((s) => normalizeStageToken(s.stage) !== token),
      ]
    : registry;

  const hits = await Promise.all(
    ordered.map(async (s) => {
      try { return (await sheetContainsWorker(s.spreadsheetId, workerId)) ? s.spreadsheetId : null; }
      catch { return null; }
    }),
  );
  const match = hits.find(Boolean) || null;
  if (match) {
    setActiveSpreadsheetId(match, workerId);
    return match;
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
