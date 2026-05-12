const SPREADSHEET_ID_REGEX = /^[a-zA-Z0-9-_]{10,200}$/;

export function parseGoogleSheetsUrl(input: string) {
  try {
    const url = new URL(input.trim());
    if (!url.hostname.includes('docs.google.com') || !url.pathname.includes('/spreadsheets/d/')) return null;

    const idMatch = url.pathname.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    const spreadsheetId = idMatch?.[1];
    if (!spreadsheetId || !SPREADSHEET_ID_REGEX.test(spreadsheetId)) return null;

    const gidRaw = url.searchParams.get('gid');
    const gid = gidRaw && /^\d+$/.test(gidRaw) ? Number(gidRaw) : null;

    return { spreadsheetId, gid };
  } catch {
    return null;
  }
}
