import { supabase } from '@/integrations/supabase/client';
import {
  SPREADSHEET_ID,
  StageSheet,
  getStoredStageSheetFor,
  setActiveSpreadsheetId,
} from '@/lib/spreadsheetConfig';

export async function loadStageSheets(): Promise<StageSheet[]> {
  const { data } = await supabase
    .from('admin_settings')
    .select('setting_value')
    .eq('setting_key', 'stage_spreadsheets')
    .maybeSingle();
  const list = (data?.setting_value as unknown as StageSheet[]) || [];
  return Array.isArray(list) ? list.filter((s) => s?.enabled && s.spreadsheetId) : [];
}

const norm = (v: string) => v.toUpperCase().replace(/\s+/g, '');

/** True when any cell of the first daily/performance tab exactly equals the worker ID. */
async function sheetContainsWorker(spreadsheetId: string, workerId: string): Promise<boolean> {
  const { data: meta } = await supabase.functions.invoke('fetch-google-sheets', {
    body: { action: 'getSheets', spreadsheetId },
  });
  const sheets: { name: string }[] = meta?.sheets || [];
  const candidates = [
    ...sheets.filter((s) => /DAILY|PERFORMANCE/i.test(s.name)),
    ...sheets.filter((s) => /RANKING/i.test(s.name)),
  ].slice(0, 2);
  const target = norm(workerId);
  for (const s of candidates) {
    const { data } = await supabase.functions.invoke('fetch-google-sheets', {
      body: { action: 'getSheetData', spreadsheetId, sheetName: s.name },
    });
    const rows: unknown[][] = [data?.headers || [], ...(data?.rows || [])];
    if (rows.some((r) => r.some((c) => norm(String(c ?? '')) === target))) return true;
  }
  return false;
}

/**
 * Pick the spreadsheet holding this worker's bonuses. Searches all registered
 * stage sheets in parallel; falls back to the default sheet when none match.
 */
export async function resolveStageSheet(workerId: string): Promise<string> {
  const stored = getStoredStageSheetFor(workerId);
  let registry: StageSheet[] = [];
  try { registry = await loadStageSheets(); } catch { /* fallback */ }

  if (registry.length === 0) {
    setActiveSpreadsheetId(null);
    return SPREADSHEET_ID;
  }
  if (stored && registry.some((s) => s.spreadsheetId === stored)) {
    setActiveSpreadsheetId(stored, workerId);
    return stored;
  }
  const hits = await Promise.all(
    registry.map(async (s) => {
      try { return (await sheetContainsWorker(s.spreadsheetId, workerId)) ? s.spreadsheetId : null; }
      catch { return null; }
    }),
  );
  const match = hits.find(Boolean) || null;
  if (match) {
    setActiveSpreadsheetId(match, workerId);
    return match;
  }
  setActiveSpreadsheetId(null);
  return SPREADSHEET_ID;
}
