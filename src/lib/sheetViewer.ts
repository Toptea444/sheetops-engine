/** Utilities for the read-only sheet-viewer beta. */
export type HighlightRange = { row: number; start: number; end: number };

const normalized = (v: unknown) => String(v ?? '').trim().toUpperCase();
const isDateHeader = (s: string) => /^(?:\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4})(?:\s|$)/.test(s.trim());
const isBlockHeader = (s: string) => /^WEEK\s*\d+\b/i.test(s.trim()) || isDateHeader(s);

/** Highlight exact current-ID matches only. Bound the highlight to the next
 * horizontal block header, falling back to the next detected ID column. */
export function findSheetHighlights(rows: string[][], workerId: string): HighlightRange[] {
  const id = normalized(workerId);
  if (!id) return [];
  const headers = new Set<number>();
  for (const row of rows.slice(0, 3)) row.forEach((v, col) => { if (isBlockHeader(v)) headers.add(col); });
  const idColumns = new Set<number>();
  for (const row of rows) row.forEach((v, col) => {
    const value = normalized(v);
    if (value === id || /^[A-Z]{4}[A-Z0-9-]{2,20}$/.test(value) && /\d/.test(value)) idColumns.add(col);
  });
  const starts = [...headers].sort((a, b) => a - b);
  const columns = [...idColumns].sort((a, b) => a - b);
  const width = rows.reduce((n, row) => Math.max(n, row.length), 0);
  const result: HighlightRange[] = [];
  const weekStarts = rows.slice(0, 3).flatMap(header => header.map((v, i) => /^WEEK\s*\d+\b/i.test(v.trim()) ? i : -1)).filter(n => n >= 0).sort((a, b) => a - b);
  rows.forEach((row, r) => row.forEach((value, col) => {
    if (normalized(value) !== id) return;
    const nextHeader = starts.find(n => n > col);
    const nextId = columns.find(n => n > col);
    // Weekly date headers occur within a block, so only use week labels when
    // present; otherwise date headers describe the daily horizontal blocks.
    const nextWeek = weekStarts.find(n => n > col);
    const boundary = weekStarts.length ? nextWeek : nextHeader;
    result.push({ row: r, start: col, end: Math.min(boundary ?? width, nextId ?? width) });
  }));
  return result;
}

export function sheetColumnName(index: number): string {
  let n = index + 1, label = '';
  while (n > 0) { n--; label = String.fromCharCode(65 + n % 26) + label; n = Math.floor(n / 26); }
  return label;
}
