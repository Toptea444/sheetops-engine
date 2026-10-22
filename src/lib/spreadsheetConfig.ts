/** Default/fallback spreadsheet used when no stage sheet matches the worker. */
export const SPREADSHEET_ID = '1pZGeK-Qic4wh40eLeeqgeltOsYjXJFE3EN-Vbj4i0ks';

export interface StageSheet {
  stage: string;
  label?: string;
  spreadsheetId: string;
  enabled: boolean;
}

const ACTIVE_KEY = 'active_stage_sheet_v1';
let activeSpreadsheetId: string | null = null;

/** Extract a spreadsheet ID from a full Google Sheets URL or return the raw ID. */
export function parseSpreadsheetId(input: string): string | null {
  const s = (input || '').trim();
  const m = s.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  const id = m ? m[1] : s;
  return /^[a-zA-Z0-9-_]{20,}$/.test(id) ? id : null;
}

export function getActiveSpreadsheetId(): string {
  if (activeSpreadsheetId) return activeSpreadsheetId;
  try {
    const raw = localStorage.getItem(ACTIVE_KEY);
    if (raw) activeSpreadsheetId = JSON.parse(raw).spreadsheetId || null;
  } catch { /* ignore */ }
  return activeSpreadsheetId || SPREADSHEET_ID;
}

export function getStoredStageSheetFor(workerId: string): string | null {
  try {
    const raw = localStorage.getItem(ACTIVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed.workerId === workerId ? parsed.spreadsheetId : null;
  } catch { return null; }
}

export function setActiveSpreadsheetId(spreadsheetId: string | null, workerId?: string) {
  activeSpreadsheetId = spreadsheetId;
  try {
    if (spreadsheetId && workerId) localStorage.setItem(ACTIVE_KEY, JSON.stringify({ workerId, spreadsheetId }));
    else localStorage.removeItem(ACTIVE_KEY);
  } catch { /* ignore */ }
}

export function getSpreadsheetCycleCacheKey(cycleKey: string, spreadsheetId = getActiveSpreadsheetId()): string {
  return `${cycleKey}::${spreadsheetId}`;
}
