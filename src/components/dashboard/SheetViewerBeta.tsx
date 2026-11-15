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

async function fetchFormatted(spreadsheetId: string, sheetName: string, key: string, signal: AbortSignal): Promise<Grid> {
  const params = new URLSearchParams({ key, ranges: `'${sheetName.replace(/'/g, "''")}'`, fields: 'sheets(properties(title),merges,data(rowData(values(formattedValue,effectiveFormat))))' });
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?${params}`, { signal });
  if (!response.ok) throw new Error(`Google Sheets returned ${response.status}. Check that the sheet is public and the key allows Sheets API requests from this site.`);
  const json = await response.json();
  const sheet = json.sheets?.find((s: { properties?: { title?: string } }) => s.properties?.title === sheetName);
  if (!sheet?.data?.[0]?.rowData) throw new Error('Google did not return grid data for this sheet.');
  const rows: Cell[][] = sheet.data[0].rowData.map((r: { values?: Cell[] }) => r.values || []);
  return { rows: rows.map(row => row.map(c => c?.formattedValue ?? '')), formats: rows.map(row => row.map(c => c?.effectiveFormat)), merges: sheet.merges || [] };
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
  const [page, setPage] = useState(0);
  const [matchIndex, setMatchIndex] = useState(-1);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (!available.some(s => s.name === selected)) setSelected(available[0]?.name || ''); }, [available, selected]);
  useEffect(() => {
    if (!open || !selected || !spreadsheetId) return;
    let cancelled = false;
    const controller = new AbortController();
    setLoading(true); setError(''); setFormatError(''); setGrid(null); setPage(0); setMatchIndex(-1);
    const load = async () => {
      if (formatKey) {
        try { const formatted = await fetchFormatted(spreadsheetId, selected, formatKey, controller.signal); if (!cancelled) { setGrid(formatted); setLoading(false); } return; }
        catch (e) { if (cancelled) return; setFormatError(e instanceof Error ? e.message : 'Browser formatting request failed.'); }
      }
      try { const values = await fetchValues(spreadsheetId, selected); if (!cancelled) setGrid(values); }
      catch (e) { if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load this sheet.'); }
      finally { if (!cancelled) setLoading(false); }
    };
    void load();
    return () => { cancelled = true; controller.abort(); };
  }, [open, selected, spreadsheetId, formatKey, refresh]);

  const highlights = useMemo(() => findSheetHighlights(grid?.rows || [], workerId), [grid, workerId]);
  const width = useMemo(() => (grid?.rows || []).reduce((max, row) => Math.max(max, row.length), 0), [grid]);
  const start = page * PAGE_SIZE;
  const end = Math.min(start + PAGE_SIZE, grid?.rows.length || 0);
  const pageCount = Math.max(1, Math.ceil((grid?.rows.length || 0) / PAGE_SIZE));
  const goToMatch = () => {
    if (!highlights.length) return;
    const nextIndex = (matchIndex + 1) % highlights.length;
    setMatchIndex(nextIndex);
    setPage(Math.floor(highlights[nextIndex].row / PAGE_SIZE));
  };
  useEffect(() => {
    if (matchIndex < 0) return;
    gridRef.current?.querySelector<HTMLElement>(`[data-match-index="${matchIndex}"]`)?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [matchIndex, page]);

  return <>
    <section className="mt-8 rounded-2xl border border-dashed border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-medium">Sheet viewer <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">Beta</span></p><p className="mt-1 text-xs text-muted-foreground">{!spreadsheetId ? 'Your spreadsheet could not be resolved. Check the error above and try again.' : available.length === 0 ? 'No sheet tabs are currently available. Try refreshing your data.' : 'Preview the spreadsheet and find your ID.'}</p></div><Button variant="outline" size="sm" disabled={!spreadsheetId || available.length === 0} onClick={() => setOpen(true)}><Sheet className="mr-2 h-4 w-4" />Open viewer</Button></div>
    </section>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="flex max-h-[90dvh] w-[96vw] max-w-6xl flex-col gap-3 overflow-hidden rounded-2xl p-4 sm:p-6">
        <DialogHeader><DialogTitle>Sheet viewer <span className="text-xs font-normal text-primary">Beta</span></DialogTitle><DialogDescription>Read-only preview. Other IDs remain visible; highlights identify matches, not ownership or verified earnings.</DialogDescription></DialogHeader>
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="beta-sheet">Sheet tab</label><select id="beta-sheet" className="h-9 max-w-full rounded-md border bg-background px-2 text-sm" value={selected} onChange={e => setSelected(e.target.value)}>{available.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}</select>
          <Button size="sm" variant="outline" disabled={loading} onClick={() => setRefresh(n => n + 1)}><RefreshCw className="mr-1 h-4 w-4" />Refresh</Button>
          <Button size="sm" variant="outline" disabled={!highlights.length} onClick={goToMatch}>Find my ID {highlights.length ? `(${highlights.length})` : ''}</Button>
        </div>
        <details className="text-xs text-muted-foreground"><summary className="cursor-pointer">Test original formatting in your browser</summary><p className="mt-2">Optional: enter a browser-restricted Google Sheets API key. It is kept only in this open page and sent directly to Google. Don’t use a secret or unrestricted key.</p><div className="mt-2 flex gap-2"><input type="password" autoComplete="off" aria-label="Browser-restricted Google Sheets API key" value={key} onChange={e => setKey(e.target.value)} className="min-w-0 flex-1 rounded-md border bg-background px-2 py-1 text-foreground" placeholder="Browser-restricted API key" /><Button size="sm" variant="outline" onClick={() => setFormatKey(key.trim())} disabled={!key.trim()}>Test formatting</Button>{formatKey && <Button size="sm" variant="ghost" onClick={() => { setFormatKey(''); setKey(''); }}>Clear</Button>}</div></details>
        {formatError && <p role="status" className="text-xs text-amber-600">Formatting test failed: {formatError} Showing values only if available.</p>}
        {!loading && grid && <p className="text-xs text-muted-foreground">{grid.formats ? 'Browser formatting preview — some Google Sheets features may differ.' : 'Values-only preview — original formatting and merged cells are not shown.'} Highlighted cells start at your current ID; block boundaries are estimated.</p>}
        {loading && <p role="status" className="py-8 text-center text-sm text-muted-foreground">Loading sheet…</p>}
        {error && <p role="alert" className="py-8 text-center text-sm text-destructive">{error}</p>}
        {!loading && grid && <>
          <div ref={gridRef} className="min-h-0 flex-1 overflow-auto rounded-md border" tabIndex={0} aria-label="Sheet grid, scroll to see more columns">
            <table className="w-max border-collapse text-xs"><thead><tr><th className="sticky left-0 z-20 border bg-muted px-2 py-1" scope="col">#</th>{Array.from({ length: width }, (_, c) => <th key={c} scope="col" className="border bg-muted px-3 py-1 font-medium">{sheetColumnName(c)}</th>)}</tr></thead><tbody>
              {grid.rows.slice(start, end).map((row, index) => { const r = start + index; return <tr key={r}><th scope="row" className="sticky left-0 z-10 border bg-muted px-2 py-1 font-normal">{r + 1}</th>{Array.from({ length: width }, (_, c) => {
                const merge = grid.merges?.find(m => r >= (m.startRowIndex ?? 0) && r < (m.endRowIndex ?? 0) && c >= (m.startColumnIndex ?? 0) && c < (m.endColumnIndex ?? 0));
                const mergeRow = merge?.startRowIndex ?? 0, mergeCol = merge?.startColumnIndex ?? 0;
                // Only render merges wholly within this page, to keep pagination correct.
                const safeMerge = merge && mergeRow >= start && (merge.endRowIndex ?? 0) <= end;
                if (safeMerge && (r !== mergeRow || c !== mergeCol)) return null;
                const f = grid.formats?.[r]?.[c];
                const matchStart = highlights.findIndex(h => h.row === r && c === h.start);
                const marked = highlights.some(h => h.row === r && c >= h.start && c < h.end);
                return <td key={c} data-match-index={matchStart >= 0 ? matchStart : undefined} colSpan={safeMerge ? (merge.endColumnIndex ?? c + 1) - c : undefined} rowSpan={safeMerge ? (merge.endRowIndex ?? r + 1) - r : undefined} className={`min-w-[90px] whitespace-nowrap border px-3 py-1 ${marked ? 'ring-2 ring-inset ring-amber-400' : ''}`} style={{ backgroundColor: color(f?.backgroundColorStyle?.rgbColor ?? f?.backgroundColor), color: color(f?.textFormat?.foregroundColorStyle?.rgbColor ?? f?.textFormat?.foregroundColor), fontWeight: f?.textFormat?.bold ? 'bold' : undefined, fontStyle: f?.textFormat?.italic ? 'italic' : undefined, fontSize: f?.textFormat?.fontSize ? `${f.textFormat.fontSize}px` : undefined, textAlign: f?.horizontalAlignment?.toLowerCase() as 'left' | 'center' | 'right' | undefined }}>
                  {row[c] ?? ''}
                </td>;
              })}</tr>; })}
            </tbody></table>
          </div>
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground"><span>Rows {start + 1}–{end} of {grid.rows.length}</span><div className="flex items-center gap-2"><Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button><span>{page + 1} / {pageCount}</span><Button size="sm" variant="outline" disabled={page + 1 >= pageCount} onClick={() => setPage(p => p + 1)}>Next</Button></div></div>
        </>}
      </DialogContent>
    </Dialog>
  </>;
}
