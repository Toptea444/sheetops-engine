/** Utilities for the read-only sheet-viewer beta. */
export type HighlightRange = { row: number; start: number; end: number };
const normalized = (v: unknown) => String(v ?? '').trim().toUpperCase();
const isWeek = (s: string) => /^WEEK\s*\d+\b/i.test(s.trim());
const isDate = (s: string) => /^(?:\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}(?:[-/]\d{2,4})?|\d{1,2}(?:ST|ND|RD|TH)?\s+(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC))/i.test(s.trim());
const isIdLabel = (s: string) => /^(?:USER\s*NAME|USER_NAME|USERNAME|USERNAMES|WORKER\s*ID|COLLECTOR\s*ID|S\d+\s*(?:NEW|OLD)?|T-?\d+\s*(?:NEW|OLD)?)$/i.test(s.trim());

/** Match the current ID exactly and use nearby section headers, not global
 * column guesses: a sheet can contain several vertically stacked layouts. */
export function findSheetHighlights(rows: string[][], workerId: string): HighlightRange[] {
  const id = normalized(workerId);
  if (!id) return [];
  const result: HighlightRange[] = [];
  // Track the latest relevant header for each column while walking downward.
  const headerByColumn = new Map<number, { row: number; end: number }>();
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r] || [];
    const labels = row.map((v, i) => isIdLabel(v) ? i : -1).filter(i => i >= 0);
    if (labels.length) {
      const prior = rows[r - 1] || [];
      const weekStarts = prior.map((v, i) => isWeek(v) ? i : -1).filter(i => i >= 0);
      const dateStarts = prior.map((v, i) => isDate(v) ? i : -1).filter(i => i >= 0);
      for (const col of labels) {
        // Prefer a TOTAL/AMOUNT end in the current block, then next block start.
        const nextLabel = labels.find(c => c > col);
        const starts = weekStarts.length ? weekStarts : dateStarts;
        const nextBlock = starts.find(c => c > col);
        const limit = Math.min(nextBlock ?? Infinity, nextLabel ?? Infinity, row.length);
        let end = col + 1;
        for (let c = col + 1; c < limit; c++) {
          if (/^(?:TOTAL|AMOUNT|RANKING BONUS)$/i.test(String(row[c] || '').trim())) end = c + 1;
        }
        if (end === col + 1 && nextBlock !== undefined) end = nextBlock;
        headerByColumn.set(col, { row: r, end });
      }
    }
    row.forEach((cell, col) => {
      if (normalized(cell) !== id) return;
      const header = headerByColumn.get(col);
      // Unknown structures: highlight only the exact ID rather than another block.
      result.push({ row: r, start: col, end: header && header.row < r ? Math.max(col + 1, header.end) : col + 1 });
    });
  }
  return result;
}

export function sheetColumnName(index: number): string {
  let n = index + 1, label = '';
  while (n > 0) { n--; label = String.fromCharCode(65 + n % 26) + label; n = Math.floor(n / 26); }
  return label;
}
