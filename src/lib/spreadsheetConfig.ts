export const SPREADSHEET_ID = '1pZGeK-Qic4wh40eLeeqgeltOsYjXJFE3EN-Vbj4i0ks';

export function getSpreadsheetCycleCacheKey(cycleKey: string, spreadsheetId = SPREADSHEET_ID): string {
  return `${cycleKey}::${spreadsheetId}`;
}