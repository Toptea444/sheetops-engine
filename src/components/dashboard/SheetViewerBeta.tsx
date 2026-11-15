import { useEffect, useMemo, useRef, useState } from 'react';
import { Sheet, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import type { SheetInfo } from '@/types/bonus';
import { findSheetHighlights, sheetColumnName } from '@/lib/sheetViewer';

type Format = { backgroundColor?: Color; backgroundColorStyle?: { rgbColor?: Color }; textFormat?: { bold?: boolean; italic?: boolean; fontSize?: number; foregroundColor?: Color; foregroundColorStyle?: { rgbColor?: Color } }; horizontalAlignment?: string };
type Color = { red?: number; green?: number; blue?: number; alpha?: number };
type Cell = { formattedValue?: string; effectiveFormat?: Format };
type Grid = { rows: string[][]; formats?: Format[][]; merges?: Array<{ startRowIndex?: number; endRowIndex?: number; startColumnIndex?: number; endColumnIndex?: number }> };
const PAGE_SIZE = 50;
const color = (c?: Color) => c ? `rgba(${Math.round((c.red ?? 0) * 255)}, ${Math.round((c.green ?? 0) * 255)}, ${Math.round((c.blue ?? 0) * 255)}, ${c.alpha ?? 1})` : undefined;

async function fetchValues(spreadsheetId: string, sheetName: string): Promise<Grid> {
  const { data, error } = await supabase.functions.invoke('fetch-google-sheets', { body: { action: 'getSheetData', spreadsheetId, sheetName } });
  if (error || data?.error) throw new Error(data?.error || 'Could not load this sheet. It may be private or temporarily unavailable.');
  return { rows: [data.headers || [], ...(data.rows || [])].map((row: unknown[]) => row.map(v => String(v ?? ''))) };
}

function parseFormatted(json: { sheets?: Array<{ properties?: { title?: string }; data?: Array<{ rowData?: Array<{ values?: Cell[] }> }>; merges?: Grid['merges'] }> }, sheetName: string): Grid {
  const sheet = json.sheets?.find(s => s.properties?.title === sheetName);
  if (!sheet?.data?.[0]?.rowData) throw new Error('Google did not return grid data for this sheet.');
  const rows: Cell[][] = sheet.data[0].rowData.map(r => r.values || []);
  return { rows: rows.map(row => row.map(c => c?.formattedValue ?? '')), formats: rows.map(row => row.map(c => c?.effectiveFormat)), merges: sheet.merges || [] };
}

async function fetchFormatted(spreadsheetId: string, sheetName: string, key: string, signal: AbortSignal): Promise<Grid> {
  const params = new URLSearchParams({ key, ranges: `'${sheetName.replace(/'/g, "''")}'`, fields: 'sheets(properties(title),merges,data(rowData(values(formattedValue,effectiveFormat))))' });
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?${params}`, { signal });
  if (!response.ok) throw new Error(`Google Sheets returned ${response.status}. Check that the sheet is public and the key allows Sheets API requests from this site.`);
  return parseFormatted(await response.json(), sheetName);
}

async function fetchServerFormatted(spreadsheetId: string, sheetName: string): Promise<Grid> {
  const { data, error } = await supabase.functions.invoke('fetch-google-sheets', { body: { action: 'getSheetFormatting', spreadsheetId, sheetName } });
  if (error || data?.error) throw new Error('Server formatting is not available yet.');
  return parseFormatted(data, sheetName);
}

interface Props { spreadsheetId: string | null; sheets: SheetInfo[]; workerId: string }
export function SheetViewerBeta({ spreadsheetId, sheets, workerId }: Props) {
  const available = useMemo(() => sheets.filter(s => !s.disabled), [sheets]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState('');
  const [grid, setGrid] = useState<Grid | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formatError, setFormatError] = useState('');
  const [key, setKey] = useState('');
  const [formatKey, setFormatKey] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [visibleRows, setVisibleRows] = useState(PAGE_SIZE);
  const [formatLoading, setFormatLoading] = useState(false);
  const cacheRef = useRef(new Map<string, Grid>());
  const sentinelRef = useRef<HTMLTableRowElement>(null);
  const [matchIndex, setMatchIndex] = useState(-1);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (!available.some(s => s.name === selected)) setSelected(available[0]?.name || ''); }, [available, selected]);
  useEffect(() => {
    if (!open || !selected || !spreadsheetId) return;
    let cancelled = false;
    let formattedReady = false;
    const controller = new AbortController();
    const cacheKey = `${spreadsheetId}:${selected}:${formatKey ? 'browser' : 'server'}`;
    const cached = cacheRef.current.get(cacheKey);
    setError(''); setFormatError(''); setMatchIndex(-1); setVisibleRows(PAGE_SIZE);
    if (cached) { setGrid(cached); setLoading(false); setFormatLoading(false); return; }
    setGrid(null); setLoading(true); setFormatLoading(true);
    // Show values as soon as available while the richer formatting loads.
    void fetchValues(spreadsheetId, selected).then(values => {
      if (!cancelled && !formattedReady) { setGrid(values); setLoading(false); }
    }).catch(e => {
      if (!cancelled && !formattedReady) { setError(e instanceof Error ? e.message : 'Could not load this sheet.'); setLoading(false); }
    });
    const formatRequest = formatKey
      ? fetchFormatted(spreadsheetId, selected, formatKey, controller.signal)
      : fetchServerFormatted(spreadsheetId, selected);
    void formatRequest.then(formatted => {
      if (cancelled) return;
      formattedReady = true; cacheRef.current.set(cacheKey, formatted);
      setGrid(formatted); setError(''); setLoading(false);
    }).catch(e => {
      if (!cancelled && formatKey) setFormatError(e instanceof Error ? e.message : 'Browser formatting request failed.');
    }).finally(() => { if (!cancelled) setFormatLoading(false); });
    return () => { cancelled = true; controller.abort(); };
  }, [open, selected, spreadsheetId, formatKey, refresh]);

  const highlights = useMemo(() => findSheetHighlights(grid?.rows || [], workerId), [grid, workerId]);
  const width = useMemo(() => (grid?.rows || []).reduce((max, row) => Math.max(max, row.length), 0), [grid]);
  const end = Math.min(visibleRows, grid?.rows.length || 0);
  const highlightRows = useMemo(() => {
    const byRow = new Map<number, Array<{ start: number; end: number; index: number }>>();
    highlights.forEach((item, index) => {
      const entries = byRow.get(item.row) || [];
      entries.push({ start: item.start, end: item.end, index });
      byRow.set(item.row, entries);
    });
    return byRow;
  }, [highlights]);
  const mergeCells = useMemo(() => {
    const cells = new Map<string, { row: number; col: number; rowSpan: number; colSpan: number }>();
    for (const m of grid?.merges || []) {
      const r = m.startRowIndex ?? 0, c = m.startColumnIndex ?? 0;
      const endRow = m.endRowIndex ?? r + 1, endCol = m.endColumnIndex ?? c + 1;
      if (endRow > end) continue;
      const merge = { row: r, col: c, rowSpan: endRow - r, colSpan: endCol - c };
      for (let y = r; y < endRow; y++) for (let x = c; x < endCol; x++) cells.set(`${y}:${x}`, merge);
    }
    return cells;
  }, [grid, end]);
  const goToMatch = () => {
    if (!highlights.length) return;
    const nextIndex = (matchIndex + 1) % highlights.length;
    setMatchIndex(nextIndex);
    setVisibleRows(n => Math.max(n, highlights[nextIndex].row + 1 + PAGE_SIZE));
  };
  useEffect(() => {
    if (matchIndex < 0) return;
    gridRef.current?.querySelector<HTMLElement>(`[data-match-index="${matchIndex}"]`)?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [matchIndex, visibleRows, grid]);
  useEffect(() => {
    const root = gridRef.current, sentinel = sentinelRef.current;
    if (!root || !sentinel || end >= (grid?.rows.length || 0) || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) setVisibleRows(n => n + PAGE_SIZE);
    }, { root, rootMargin: '250px' });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [grid, end]);

  return <>
    <section className="mt-8 rounded-2xl border border-dashed border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-medium">Sheet viewer <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">Beta</span></p><p className="mt-1 text-xs text-muted-foreground">{!spreadsheetId ? 'Your spreadsheet could not be resolved. Check the error above and try again.' : available.length === 0 ? 'No sheet tabs are currently available. Try refreshing your data.' : 'Preview the spreadsheet and find your ID.'}</p></div><Button variant="outline" size="sm" disabled={!spreadsheetId || available.length === 0} onClick={() => setOpen(true)}><Sheet className="mr-2 h-4 w-4" />Open viewer</Button></div>
    </section>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-screen max-w-none flex-col gap-2 overflow-hidden rounded-none p-2 sm:h-[90dvh] sm:max-h-[90dvh] sm:w-[96vw] sm:max-w-6xl sm:rounded-2xl sm:p-6">
        <DialogHeader><DialogTitle>Sheet viewer <span className="text-xs font-normal text-primary">Beta</span></DialogTitle><DialogDescription>Read-only preview. Other IDs remain visible; highlights identify matches, not ownership or verified earnings.</DialogDescription></DialogHeader>
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="beta-sheet">Sheet tab</label><select id="beta-sheet" className="h-9 max-w-full rounded-md border bg-background px-2 text-sm" value={selected} onChange={e => setSelected(e.target.value)}>{available.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}</select>
          <Button size="sm" variant="outline" disabled={loading} onClick={() => { cacheRef.current.clear(); setRefresh(n => n + 1); }}><RefreshCw className="mr-1 h-4 w-4" />Refresh</Button>
          <Button size="sm" variant="outline" disabled={!highlights.length} onClick={goToMatch}>Find my ID {highlights.length ? `(${highlights.length})` : ''}</Button>
        </div>
        <details className="text-xs text-muted-foreground"><summary className="cursor-pointer">Test original formatting in your browser</summary><p className="mt-2">Optional: enter a browser-restricted Google Sheets API key. It is kept only in this open page and sent directly to Google. Don’t use a secret or unrestricted key.</p><div className="mt-2 flex gap-2"><input type="password" autoComplete="off" aria-label="Browser-restricted Google Sheets API key" value={key} onChange={e => setKey(e.target.value)} className="min-w-0 flex-1 rounded-md border bg-background px-2 py-1 text-foreground" placeholder="Browser-restricted API key" /><Button size="sm" variant="outline" onClick={() => { cacheRef.current.clear(); setFormatKey(key.trim()); }} disabled={!key.trim()}>Test formatting</Button>{formatKey && <Button size="sm" variant="ghost" onClick={() => { cacheRef.current.clear(); setFormatKey(''); setKey(''); }}>Clear</Button>}</div></details>
        {formatLoading && grid && <p role="status" className="text-xs text-muted-foreground">Loading sheet formatting…</p>}
        {formatError && <p role="status" className="text-xs text-amber-600">Formatting test failed: {formatError} Showing values only if available.</p>}
        {!loading && grid && <p className="text-xs text-muted-foreground">{grid.formats ? 'Browser formatting preview — some Google Sheets features may differ.' : 'Values-only preview — original formatting and merged cells are not shown.'} Highlighted cells start at your current ID; block boundaries are estimated.</p>}
        {loading && <p role="status" className="py-8 text-center text-sm text-muted-foreground">Loading sheet…</p>}
        {error && <p role="alert" className="py-8 text-center text-sm text-destructive">{error}</p>}
        {!loading && grid && <>
          <div ref={gridRef} className="min-h-0 min-w-0 w-full flex-1 overflow-auto rounded-md border" tabIndex={0} aria-label="Sheet grid, scroll to see more columns">
            <table className="w-max border-collapse text-xs"><thead><tr><th className="sticky left-0 z-20 border bg-muted px-2 py-1" scope="col">#</th>{Array.from({ length: width }, (_, c) => <th key={c} scope="col" className="border bg-muted px-3 py-1 font-medium">{sheetColumnName(c)}</th>)}</tr></thead><tbody>
              {grid.rows.slice(0, end).map((row, index) => { const r = index; return <tr key={r}><th scope="row" className="sticky left-0 z-10 border bg-muted px-2 py-1 font-normal">{r + 1}</th>{Array.from({ length: width }, (_, c) => {
                const merge = mergeCells.get(`${r}:${c}`);
                if (merge && (r !== merge.row || c !== merge.col)) return null;
                const f = grid.formats?.[r]?.[c];
                const matching = highlightRows.get(r) || [];
                const matchStart = matching.find(h => c === h.start)?.index ?? -1;
                const marked = matching.some(h => c >= h.start && c < h.end);
                return <td key={c} data-match-index={matchStart >= 0 ? matchStart : undefined} colSpan={merge?.colSpan} rowSpan={merge?.rowSpan} className={`min-w-[90px] whitespace-nowrap border px-3 py-1 ${marked ? 'ring-2 ring-inset ring-amber-400' : ''}`} style={{ backgroundColor: color(f?.backgroundColorStyle?.rgbColor ?? f?.backgroundColor), color: color(f?.textFormat?.foregroundColorStyle?.rgbColor ?? f?.textFormat?.foregroundColor), fontWeight: f?.textFormat?.bold ? 'bold' : undefined, fontStyle: f?.textFormat?.italic ? 'italic' : undefined, fontSize: f?.textFormat?.fontSize ? `${f.textFormat.fontSize}px` : undefined, textAlign: f?.horizontalAlignment?.toLowerCase() as 'left' | 'center' | 'right' | undefined }}>
                  {row[c] ?? ''}
                </td>;
              })}</tr>; })}
              {end < grid.rows.length && <tr ref={sentinelRef}><td colSpan={width + 1} className="py-3 text-center text-muted-foreground">Loading more rows…</td></tr>}
            </tbody></table>
          </div>
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground"><span>Rows 1–{end} of {grid.rows.length}</span>{end < grid.rows.length && <Button size="sm" variant="outline" onClick={() => setVisibleRows(n => n + PAGE_SIZE)}>Load more rows</Button>}</div>
        </>}
      </DialogContent>
    </Dialog>
  </>;
}
