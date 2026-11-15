/** Utilities for the read-only sheet-viewer beta. End columns are exclusive. */
export type HighlightRange = { row: number; start: number; end: number };
export type SheetMatch = HighlightRange & { sectionRow: number; date: string | null; total: string | null };
const normalized = (v: unknown) => String(v ?? '').trim().replace(/\s+/g, ' ').toUpperCase();
const isWeek = (s: string) => /^WEEK\s*\d+\b/i.test(s.trim());
const isDate = (s: string) => /^(?:\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}(?:[-/]\d{2,4})?|\d{1,2}(?:ST|ND|RD|TH)?\s+(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC))/i.test(s.trim());
const isIdLabel = (s: string) => /^(?:USER\s*NAME|USER_NAME|USERNAME|USERNAMES|WORKER\s*ID|COLLECTOR\s*ID|NAME|NAMES|PRODUCT|ID|S\d+\s*(?:NEW|OLD)?|T-?\d+\s*(?:NEW|OLD)?)$/i.test(s.trim());
const isTotal = (s: string) => /^(?:TOTAL(?:\b.*)?|AMOUNT)$/i.test(normalized(s));
const isHeaderValue = (s: string) => isTotal(s) || /^(?:BONUS|RANK|RATE|RECOVERY|TARGET)/i.test(normalized(s));

/** Find exact IDs using their nearest horizontal/vertical section headers.
 * Unknown blocks conservatively highlight only the ID, rather than someone else's data. */
export function findSheetMatches(rows: string[][], workerId: string): SheetMatch[] {
  const id = normalized(workerId);
  if (!id) return [];
  const result: SheetMatch[] = [];
  const headers = new Map<number, { row: number; end: number; date: string | null; totalCol: number | null }>();
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r] || [];
    const labels = row.map((v, i) => isIdLabel(v) ? i : -1).filter(i => i >= 0);
    // Stage labels may also occur in ordinary data rows; require actual column headings.
    if (labels.length && row.some(v => isHeaderValue(v) || isDate(v))) {
      const nearby = rows.slice(Math.max(0, r - 3), r);
      const priorWithWeek = [...nearby].reverse().find(line => line.some(isWeek));
      const priorWithDate = [...nearby].reverse().find(line => line.some(isDate));
      const dateRow = priorWithWeek || priorWithDate || [];
      const starts = dateRow.map((v, i) => (priorWithWeek ? isWeek(v) : isDate(v)) ? i : -1).filter(i => i >= 0);
      for (const col of labels) {
        const nextLabel = labels.find(c => c > col);
        const nextBlock = starts.find(c => c > col);
        const limit = Math.min(nextBlock ?? Infinity, nextLabel ?? Infinity, row.length);
        let end = col + 1;
        let totalCol: number | null = null;
        for (let c = col + 1; c < limit; c++) {
          if (isTotal(row[c] || '')) { end = c + 1; totalCol = c; }
        }
        if (end === col + 1 && nextBlock !== undefined) end = nextBlock;
        const dateCol = [...starts].reverse().find(c => c <= col);
        const date = dateCol === undefined ? headers.get(col)?.date ?? null : String(dateRow[dateCol] || '').trim() || null;
        headers.set(col, { row: r, end, date, totalCol });
      }
    }
    row.forEach((cell, col) => {
      if (normalized(cell) !== id) return;
      const h = headers.get(col);
      const usable = h && h.row < r;
      result.push({ row: r, start: col, end: usable ? Math.max(col + 1, h.end) : col + 1, sectionRow: usable ? h.row : r, date: usable ? h.date : null, total: usable && h.totalCol !== null ? String(row[h.totalCol] ?? '').trim() || null : null });
    });
  }
  // Sheet order: sections top-to-bottom, blocks left-to-right, then rows.
  return result.sort((a, b) => a.sectionRow - b.sectionRow || a.start - b.start || a.row - b.row);
}
export function findSheetHighlights(rows: string[][], workerId: string): HighlightRange[] {
  return findSheetMatches(rows, workerId).map(({ row, start, end }) => ({ row, start, end }));
}
export function sheetColumnName(index: number): string {
  let n = index + 1, label = '';
  while (n > 0) { n--; label = String.fromCharCode(65 + n % 26) + label; n = Math.floor(n / 26); }
  return label;
}
