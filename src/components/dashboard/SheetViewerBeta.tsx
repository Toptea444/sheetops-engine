import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw, Sheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import type { SheetInfo } from '@/types/bonus';
import { findSheetMatches, sheetColumnName } from '@/lib/sheetViewer';

type Color = { red?: number; green?: number; blue?: number; alpha?: number };
type Format = { backgroundColor?: Color; backgroundColorStyle?: { rgbColor?: Color }; textFormat?: { bold?: boolean; italic?: boolean; fontSize?: number; foregroundColor?: Color; foregroundColorStyle?: { rgbColor?: Color } }; horizontalAlignment?: string };
type Merge = { startRowIndex?: number; endRowIndex?: number; startColumnIndex?: number; endColumnIndex?: number };
type Tile = { startRow: number; startCol: number; formats: Format[][]; merges: Merge[] };
type Position = { top: number; left: number; height: number; width: number };
const ROW_HEIGHT = 32, COL_WIDTH = 105, ROW_HEADER_WIDTH = 48, TILE_ROWS = 50, TILE_COLS = 40;
const color = (c?: Color) => c ? `rgba(${Math.round((c.red ?? 0) * 255)}, ${Math.round((c.green ?? 0) * 255)}, ${Math.round((c.blue ?? 0) * 255)}, ${c.alpha ?? 1})` : undefined;

async function fetchValues(spreadsheetId: string, sheetName: string): Promise<string[][]> {
  const { data, error } = await supabase.functions.invoke('fetch-google-sheets', { body: { action: 'getSheetData', spreadsheetId, sheetName } });
  if (error || data?.error) throw new Error(data?.error || 'Could not load this sheet. It may be private or temporarily unavailable.');
  return [data.headers || [], ...(data.rows || [])].map((row: unknown[]) => row.map(v => String(v ?? '')));
}

type GridResponse = { sheets?: Array<{ properties?: { title?: string }; merges?: Merge[]; data?: Array<{ startRow?: number; startColumn?: number; rowData?: Array<{ values?: Array<{ effectiveFormat?: Format }> }> }> }> };
function parseTile(json: GridResponse, sheetName: string, startRow: number, startCol: number): Tile {
  const sheet = json.sheets?.find(s => s.properties?.title === sheetName);
  if (!sheet) throw new Error('Google did not return this sheet.');
  const data = sheet.data?.[0];
  return { startRow: data?.startRow ?? startRow, startCol: data?.startColumn ?? startCol, formats: (data?.rowData || []).map(row => (row.values || []).map(cell => cell?.effectiveFormat)), merges: sheet.merges || [] };
}
async function fetchTile(spreadsheetId: string, sheetName: string, startRow: number, startCol: number, endRow: number, endCol: number, key: string, signal: AbortSignal): Promise<Tile> {
  if (!key) {
    const { data, error } = await supabase.functions.invoke('fetch-google-sheets', { body: { action: 'getSheetFormattingRange', spreadsheetId, sheetName, startRow, startCol, endRow, endCol }, signal });
    if (error || data?.error) throw new Error('Automatic formatting is not available yet.');
    return parseTile(data, sheetName, startRow, startCol);
  }
  const range = `'${sheetName.replace(/'/g, "''")}'!${sheetColumnName(startCol)}${startRow + 1}:${sheetColumnName(endCol - 1)}${endRow}`;
  const params = new URLSearchParams({ key, ranges: range, fields: 'sheets(properties(title),merges,data(startRow,startColumn,rowData(values(effectiveFormat(backgroundColor,backgroundColorStyle,textFormat(bold,italic,fontSize,foregroundColor,foregroundColorStyle),horizontalAlignment)))))' });
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?${params}`, { signal });
  if (!response.ok) throw new Error(`Google Sheets returned ${response.status}. Check the key restrictions and sheet access.`);
  return parseTile(await response.json(), sheetName, startRow, startCol);
}

interface Props { spreadsheetId: string | null; sheets: SheetInfo[]; workerId: string }
export function SheetViewerBeta({ spreadsheetId, sheets, workerId }: Props) {
  const available = useMemo(() => sheets.filter(s => !s.disabled), [sheets]);
  const [open, setOpen] = useState(false), [selected, setSelected] = useState('');
  const [rows, setRows] = useState<string[][] | null>(null), [loading, setLoading] = useState(false), [error, setError] = useState('');
  const [formatError, setFormatError] = useState(''), [formatLoading, setFormatLoading] = useState(false);
  const [key, setKey] = useState(''), [formatKey, setFormatKey] = useState('');
  const [refresh, setRefresh] = useState(0), [matchIndex, setMatchIndex] = useState(-1), [flash, setFlash] = useState(0);
  const [position, setPosition] = useState<Position>({ top: 0, left: 0, height: 600, width: 400 });
  const [tiles, setTiles] = useState<Map<string, Tile>>(new Map());
  const valuesCache = useRef(new Map<string, string[][]>());
  const tileCache = useRef(new Map<string, Tile>());
  const gridRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const positionedFlashRef = useRef(0);

  useEffect(() => { if (!available.some(s => s.name === selected)) setSelected(available[0]?.name || ''); }, [available, selected]);
  useEffect(() => {
    if (!open || !selected || !spreadsheetId) return;
    let cancelled = false;
    const cacheKey = `${spreadsheetId}:${selected}`;
    setError(''); setFormatError(''); setMatchIndex(-1); setPosition(p => ({ ...p, top: 0, left: 0 })); setTiles(new Map());
    const cached = valuesCache.current.get(cacheKey);
    if (cached) { setRows(cached); setLoading(false); return; }
    setRows(null); setLoading(true);
    void fetchValues(spreadsheetId, selected).then(values => {
      if (!cancelled) { valuesCache.current.set(cacheKey, values); while (valuesCache.current.size > 2) valuesCache.current.delete(valuesCache.current.keys().next().value!); setRows(values); }
    }).catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load this sheet.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, selected, spreadsheetId, refresh]);

  const matches = useMemo(() => findSheetMatches(rows || [], workerId), [rows, workerId]);
  const width = useMemo(() => (rows || []).reduce((max, row) => Math.max(max, row.length), 0), [rows]);
  const firstRow = Math.max(0, Math.floor(Math.max(0, position.top - ROW_HEIGHT) / ROW_HEIGHT) - 12);
  const lastRow = Math.min(rows?.length || 0, Math.ceil((position.top + position.height) / ROW_HEIGHT) + 12);
  const firstCol = Math.max(0, Math.floor(Math.max(0, position.left - ROW_HEADER_WIDTH) / COL_WIDTH) - 2);
  const lastCol = Math.min(width, Math.ceil((position.left + position.width) / COL_WIDTH) + 2);
  const visibleTileKeys = useMemo(() => {
    const keys: string[] = [];
    for (let r = Math.floor(firstRow / TILE_ROWS) * TILE_ROWS; r < lastRow; r += TILE_ROWS)
      for (let c = Math.floor(firstCol / TILE_COLS) * TILE_COLS; c < lastCol; c += TILE_COLS) keys.push(`${r}:${c}`);
    return keys;
  }, [firstRow, lastRow, firstCol, lastCol]);
  const tileSignature = visibleTileKeys.join(',');
  const sourceKey = `${spreadsheetId}:${selected}:${formatKey ? 'browser' : 'server'}`;
  useEffect(() => {
    if (!open || !rows || !spreadsheetId || !selected || !tileSignature) return;
    const controller = new AbortController();
    let cancelled = false;
    const keys = tileSignature.split(',');
    const missing = keys.filter(k => !tileCache.current.has(`${sourceKey}:${k}`));
    const display = () => {
      const next = new Map<string, Tile>();
      keys.forEach(k => { const tile = tileCache.current.get(`${sourceKey}:${k}`); if (tile) next.set(k, tile); });
      if (!cancelled) setTiles(next);
    };
    display();
    if (!missing.length || formatError) { setFormatLoading(false); return; }
    setFormatLoading(true);
    // Sequential bounded requests avoid downloading an entire formatted sheet or
    // overwhelming mobile devices. Keep the values grid usable during loading.
    void (async () => {
      for (const k of missing) {
        if (cancelled) break;
        const [r, c] = k.split(':').map(Number);
        try {
          const tile = await fetchTile(spreadsheetId, selected, r, c, Math.min(r + TILE_ROWS, rows.length), Math.min(c + TILE_COLS, width), formatKey, controller.signal);
          if (cancelled) break;
          tileCache.current.set(`${sourceKey}:${k}`, tile);
          // Avoid retaining all formatting for huge workbooks in mobile memory.
          while (tileCache.current.size > 16) tileCache.current.delete(tileCache.current.keys().next().value!);
          display();
        } catch (e) {
          if (!cancelled) setFormatError(e instanceof Error ? e.message : 'Could not load formatting.');
          break;
        }
      }
      if (!cancelled) setFormatLoading(false);
    })();
    return () => { cancelled = true; controller.abort(); };
  }, [open, rows, spreadsheetId, selected, formatKey, sourceKey, tileSignature, formatError, refresh, width]);

  const matchRows = useMemo(() => {
    const byRow = new Map<number, Array<{ start: number; end: number; index: number }>>();
    matches.forEach((m, index) => { const list = byRow.get(m.row) || []; list.push({ start: m.start, end: m.end, index }); byRow.set(m.row, list); });
    return byRow;
  }, [matches]);
  const mergeCells = useMemo(() => {
    const cells = new Map<string, { row: number; col: number; rowSpan: number; colSpan: number }>();
    for (const tile of tiles.values()) for (const m of tile.merges) {
      const r = m.startRowIndex ?? 0, c = m.startColumnIndex ?? 0, endR = m.endRowIndex ?? r + 1, endC = m.endColumnIndex ?? c + 1;
      if (r < firstRow || endR > lastRow || endC > width || endR - r > 50 || endC - c > 80) continue;
      const item = { row: r, col: c, rowSpan: endR - r, colSpan: endC - c };
      for (let y = r; y < endR; y++) for (let x = c; x < endC; x++) cells.set(`${y}:${x}`, item);
    }
    return cells;
  }, [tiles, firstRow, lastRow, width]);
  const updatePosition = () => {
    const el = gridRef.current;
    if (!el || frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(() => { frameRef.current = null; setPosition({ top: el.scrollTop, left: el.scrollLeft, height: el.clientHeight, width: el.clientWidth }); });
  };
  useEffect(() => {
    if (!open || !rows || !gridRef.current) return;
    updatePosition();
    const el = gridRef.current;
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updatePosition);
    observer?.observe(el);
    return () => { observer?.disconnect(); if (frameRef.current !== null) { cancelAnimationFrame(frameRef.current); frameRef.current = null; } };
  }, [open, rows]);
  const goToMatch = (index: number) => {
    const match = matches[index], el = gridRef.current;
    if (!match || !el) return;
    setMatchIndex(index); setFlash(n => n + 1);
    el.scrollTo({ top: Math.max(0, match.row * ROW_HEIGHT - el.clientHeight / 3), left: Math.max(0, match.start * COL_WIDTH - ROW_HEADER_WIDTH), behavior: 'auto' });
    setPosition({ top: el.scrollTop, left: el.scrollLeft, height: el.clientHeight, width: el.clientWidth });
  };
  // Position against the actual rendered cell after virtual rows mount. This
  // corrects accumulated row-height rounding and keeps the flash in view.
  useLayoutEffect(() => {
    if (matchIndex < 0 || !gridRef.current || positionedFlashRef.current === flash) return;
    const root = gridRef.current;
    const target = root.querySelector<HTMLElement>(`[data-match-start="${matchIndex}"]`);
    if (!target) return;
    positionedFlashRef.current = flash;
    const bounds = root.getBoundingClientRect(), cell = target.getBoundingClientRect();
    if (cell.top < bounds.top || cell.bottom > bounds.bottom || cell.left < bounds.left || cell.right > bounds.right) {
      root.scrollBy({ top: cell.top - bounds.top - root.clientHeight / 3, left: cell.left - bounds.left - ROW_HEADER_WIDTH, behavior: 'auto' });
      setPosition({ top: root.scrollTop, left: root.scrollLeft, height: root.clientHeight, width: root.clientWidth });
    }
  }, [matchIndex, flash, firstRow, lastRow]);
  const active = matches[matchIndex];
  const resetFormatting = (newKey: string) => { tileCache.current.clear(); setTiles(new Map()); setFormatError(''); setFormatKey(newKey); setRefresh(n => n + 1); };

  return <>
    <section className="mt-8 rounded-2xl border border-dashed border-border bg-card p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-medium">Sheet viewer <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">Beta</span></p><p className="mt-1 text-xs text-muted-foreground">{!spreadsheetId ? 'Your spreadsheet could not be resolved. Check the error above and try again.' : available.length === 0 ? 'No sheet tabs are currently available. Try refreshing your data.' : 'Preview the spreadsheet and find your ID.'}</p></div><Button variant="outline" size="sm" disabled={!spreadsheetId || available.length === 0} onClick={() => setOpen(true)}><Sheet className="mr-2 h-4 w-4" />Open viewer</Button></div></section>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="flex h-[100dvh] max-h-[100dvh] w-screen max-w-none flex-col gap-2 overflow-hidden rounded-none p-2 sm:h-[90dvh] sm:max-h-[90dvh] sm:w-[96vw] sm:max-w-6xl sm:rounded-2xl sm:p-6">
      <DialogHeader><DialogTitle>Sheet viewer <span className="text-xs font-normal text-primary">Beta</span></DialogTitle><DialogDescription>Read-only sheet. Other IDs are visible; a match is not proof of ownership.</DialogDescription></DialogHeader>
      <div className="flex flex-wrap items-center gap-2 pr-8"><label className="sr-only" htmlFor="beta-sheet">Sheet tab</label><select id="beta-sheet" className="h-9 min-w-0 max-w-[55%] rounded-md border bg-background px-2 text-sm" value={selected} onChange={e => setSelected(e.target.value)}>{available.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}</select>
        <Button size="sm" variant="outline" disabled={loading} onClick={() => { valuesCache.current.clear(); tileCache.current.clear(); setFormatError(''); setRefresh(n => n + 1); }} aria-label="Refresh sheet"><RefreshCw className="h-4 w-4" /></Button>
        {matchIndex < 0 && <Button size="sm" variant="outline" disabled={!matches.length} onClick={() => goToMatch(0)}>Find my ID {matches.length ? `(${matches.length})` : ''}</Button>}
      </div>
      {active && <div className="flex min-w-0 items-center justify-between gap-2 rounded-xl bg-muted/50 px-3 py-2" aria-live="polite"><div className="min-w-0"><p className="truncate text-sm font-medium">{active.date || `Date unavailable · row ${active.row + 1}`}</p><p className="text-xs text-muted-foreground">{matchIndex + 1} of {matches.length}{active.total ? ` · Total: ${active.total}` : ''}</p></div><div className="flex shrink-0 gap-1"><Button size="icon" variant="outline" className="h-8 w-8" aria-label="Previous match" disabled={matchIndex === 0} onClick={() => goToMatch(matchIndex - 1)}><ChevronLeft className="h-4 w-4" /></Button><Button size="icon" variant="outline" className="h-8 w-8" aria-label="Next match" disabled={matchIndex === matches.length - 1} onClick={() => goToMatch(matchIndex + 1)}><ChevronRight className="h-4 w-4" /></Button></div></div>}
      <details className="text-xs text-muted-foreground"><summary className="cursor-pointer">Test original formatting in your browser</summary><p className="mt-2">Use only a website-restricted Google Sheets API key, not a server secret. It stays in this page and is sent directly to Google.</p><div className="mt-2 flex gap-2"><input type="password" autoComplete="off" aria-label="Browser-restricted Google Sheets API key" value={key} onChange={e => setKey(e.target.value)} className="min-w-0 flex-1 rounded-md border bg-background px-2 py-1 text-foreground" placeholder="Browser-restricted API key" /><Button size="sm" variant="outline" onClick={() => resetFormatting(key.trim())} disabled={!key.trim()}>Test</Button>{formatKey && <Button size="sm" variant="ghost" onClick={() => { setKey(''); resetFormatting(''); }}>Clear</Button>}</div></details>
      {formatError && <p role="status" className="text-xs text-amber-600">{formatKey ? formatError : 'Automatic formatting is unavailable. Showing sheet values only.'}</p>}
      {formatLoading && <p role="status" className="text-xs text-muted-foreground">Loading formatting for this view…</p>}
      {loading && <p role="status" className="py-8 text-center text-sm text-muted-foreground">Loading sheet…</p>}{error && <p role="alert" className="py-8 text-center text-sm text-destructive">{error}</p>}
      {!loading && rows && <div ref={gridRef} onScroll={updatePosition} className="min-h-0 min-w-0 w-full flex-1 overflow-auto border" tabIndex={0} aria-label="Sheet grid, scroll in both directions">
        <table className="border-collapse text-xs" style={{ tableLayout: 'fixed', width: ROW_HEADER_WIDTH + width * COL_WIDTH }}><colgroup><col style={{ width: ROW_HEADER_WIDTH }} />{Array.from({ length: width }, (_, c) => <col key={c} style={{ width: COL_WIDTH }} />)}</colgroup><thead><tr style={{ height: ROW_HEIGHT }}><th className="sticky left-0 z-20 border bg-muted" scope="col">#</th>{Array.from({ length: width }, (_, c) => <th key={c} scope="col" className="border bg-muted font-medium">{sheetColumnName(c)}</th>)}</tr></thead><tbody>
          {firstRow > 0 && <tr aria-hidden="true"><td colSpan={width + 1} style={{ height: firstRow * ROW_HEIGHT, padding: 0, border: 0 }} /></tr>}
          {rows.slice(firstRow, lastRow).map((row, i) => { const r = firstRow + i; return <tr key={r} style={{ height: ROW_HEIGHT }}><th scope="row" className="sticky left-0 z-10 border bg-muted font-normal">{r + 1}</th>{Array.from({ length: width }, (_, c) => {
            const merge = mergeCells.get(`${r}:${c}`); if (merge && (r !== merge.row || c !== merge.col)) return null;
            const tile = tiles.get(`${Math.floor(r / TILE_ROWS) * TILE_ROWS}:${Math.floor(c / TILE_COLS) * TILE_COLS}`);
            const f = tile?.formats[r - tile.startRow]?.[c - tile.startCol];
            const matching = matchRows.get(r) || [], found = matching.find(h => c >= h.start && c < h.end);
            const selectedMatch = found?.index === matchIndex;
            return <td key={c} data-match-start={found && c === found.start ? found.index : undefined} colSpan={merge?.colSpan} rowSpan={merge?.rowSpan} className={`border p-0 ${found ? 'ring-2 ring-inset ring-amber-400' : ''}`} style={{ backgroundColor: color(f?.backgroundColorStyle?.rgbColor ?? f?.backgroundColor), color: color(f?.textFormat?.foregroundColorStyle?.rgbColor ?? f?.textFormat?.foregroundColor), fontWeight: f?.textFormat?.bold ? 'bold' : undefined, fontStyle: f?.textFormat?.italic ? 'italic' : undefined, fontSize: f?.textFormat?.fontSize ? `${Math.min(f.textFormat.fontSize, 22)}px` : undefined, textAlign: f?.horizontalAlignment?.toLowerCase() as 'left' | 'center' | 'right' | undefined }}><div key={selectedMatch ? `flash-${flash}` : 'normal'} className={`h-8 overflow-hidden whitespace-nowrap px-2 leading-8 ${selectedMatch ? 'sheet-match-flash' : ''}`} title={row[c] ?? ''}>{row[c] ?? ''}</div></td>;
          })}</tr>; })}
          {lastRow < rows.length && <tr aria-hidden="true"><td colSpan={width + 1} style={{ height: (rows.length - lastRow) * ROW_HEIGHT, padding: 0, border: 0 }} /></tr>}
        </tbody></table></div>}
      {!loading && rows && !matches.length && <p className="text-xs text-muted-foreground">Your current ID wasn’t found in this tab.</p>}
    </DialogContent></Dialog>
  </>;
}
