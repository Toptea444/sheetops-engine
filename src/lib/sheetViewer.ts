/** Utilities for the read-only sheet-viewer beta. End columns are exclusive. */
export type HighlightRange = { row: number; start: number; end: number };
export type SheetMatch = HighlightRange & { sectionRow: number; date: string | null; total: string | null };
const normalized = (v: unknown) => String(v ?? '').trim().replace(/\s+/g, ' ').toUpperCase();
const isWeek = (s: string) => /^WEEK\s*\d+\b/i.test(s.trim());
// The earnings parser accepts dates embedded within a cell, including ordinal
// month names without a separating space. Do not interpret plain numbers as dates.
const isDate = (s: string) => /\b(?:\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{1,2}(?:ST|ND|RD|TH)?\s*(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*(?:\s+\d{4})?)\b/i.test(s.trim());
const isIdLabel = (s: string) => /^(?:USER\s*NAMES?|USER_NAME|USERNAME|USERNAMES|USER\s*ID|USER_ID|WORKER\s*ID|COLLECTOR\s*ID|NAME|NAMES|PRODUCT|ID|S\d+\s*(?:NEW|OLD)?|T-?\d+\s*(?:NEW|OLD)?)$/i.test(normalized(s));
const isTotal = (s: string) => /^(?:TOTAL(?:\b.*)?|AMOUNT|RANKING\s+BONUS)$/i.test(normalized(s));
const isHeaderValue = (s: string) => isTotal(s) || /^(?:BONUS|RANK|RATE|RECOVERY|TARGET)/i.test(normalized(s));

type DateBlock = { start: number; end: number | null; date: string; sectionRow: number };
type ColumnHeader = { row: number; end: number; date: string | null; totalCol: number | null; dateRow: number };

/** Exact-ID lookup. Track date blocks across all sheet rows, including large
 * standards sections and vertically stacked collector tables. */
export function findSheetMatches(rows: string[][], workerId: string): SheetMatch[] {
  const id = normalized(workerId);
  if (!id) return [];
  const result: SheetMatch[] = [];
  const headers = new Map<number, ColumnHeader>();
  let blocks: DateBlock[] = [];
  let weekBlocks: DateBlock[] = [];
  let weeklyLabelsRow = -1;

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r] || [];
    const labels = row.map((v, i) => isIdLabel(v) ? i : -1).filter(i => i >= 0);
    const hasHeadings = labels.length > 0 && row.some(v => isHeaderValue(v) || isDate(v));
    const weeks = row.map((v, i) => isWeek(v) ? i : -1).filter(i => i >= 0);
    const dates = row.map((v, i) => isDate(v) ? i : -1).filter(i => i >= 0);
    const toBlocks = (starts: number[]): DateBlock[] => starts.map((start, i) => {
      // A repeated block width gives a safe bound to the final block too.
      const previousWidth = i > 0 ? start - starts[i - 1] : null;
      return { start, end: starts[i + 1] ?? (previousWidth ? start + previousWidth : null), date: String(row[start] ?? '').trim(), sectionRow: r };
    });
    if (weeks.length) { weekBlocks = toBlocks(weeks); weeklyLabelsRow = -1; blocks = weekBlocks; }
    // Weekly column labels contain daily dates; don't mistake those for separate
    // horizontal blocks or override the week labels directly above them.
    else if (hasHeadings && weekBlocks.length && weeklyLabelsRow < 0) { weeklyLabelsRow = r; }
    else if (dates.length && !hasHeadings) { blocks = toBlocks(dates); weekBlocks = []; }

    if (hasHeadings) {
      const activeBlocks = weekBlocks.length && weeklyLabelsRow === r ? weekBlocks : blocks;
      for (const col of labels) {
        const block = [...activeBlocks].reverse().find(b => b.start <= col && (b.end === null || col < b.end));
        const nextLabel = labels.find(c => c > col);
        const limit = Math.min(block?.end ?? Infinity, nextLabel ?? Infinity, row.length);
        let end = col + 1;
        let totalCol: number | null = null;
        for (let c = col + 1; c < limit; c++) if (isTotal(row[c] || '')) { end = c + 1; totalCol = c; }
        if (end === col + 1 && block?.end !== null && block?.end !== undefined) end = block.end;
        const prior = headers.get(col);
        headers.set(col, { row: r, end, totalCol, date: block?.date ?? prior?.date ?? null, dateRow: block?.sectionRow ?? prior?.dateRow ?? r });
      }
    }
    row.forEach((cell, col) => {
      if (normalized(cell) !== id) return;
      const block = [...blocks].reverse().find(b => b.start <= col && (b.end === null || col < b.end));
      const h = headers.get(col);
      // A later date header supersedes a stale column header from an older section.
      const usable = h && h.row < r && (!block || h.row >= block.sectionRow);
      const inferredEnd = block?.end !== null && block?.end !== undefined ? Math.min(block.end, row.length) : col + 1;
      const end = usable ? Math.max(col + 1, h.end, inferredEnd) : Math.max(col + 1, inferredEnd);
      // When a known total exists, stop there rather than include spacer columns.
      const boundedEnd = usable && h.totalCol !== null ? h.totalCol + 1 : end;
      result.push({ row: r, start: col, end: boundedEnd, sectionRow: usable ? h.dateRow : block?.sectionRow ?? r, date: usable ? h.date : block?.date ?? null, total: usable && h.totalCol !== null ? String(row[h.totalCol] ?? '').trim() || null : null });
    });
  }
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
