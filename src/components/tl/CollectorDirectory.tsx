import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getCycleForDate, getCycleKey, type CyclePeriod } from '@/lib/cycleUtils';
import { suggestedStageSources } from '@/lib/tlContext';
import type { StageSheet } from '@/lib/spreadsheetConfig';
import { listCollectors, localDay, ownedOn, resolveCollectorHistory, windowIntersectsCycle } from '@/lib/tlCollectors';
import type { IdSwap } from '@/lib/swapOwnership';
import type { BonusResult, SheetData, WorkerData } from '@/types/bonus';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type Props = {
  data: SheetData;
  sourceLabel: string;
  source?: StageSheet;
  sources: StageSheet[];
  cycle: CyclePeriod;
  onCycleChange: (cycle: CyclePeriod) => void;
  query: string;
  onQueryChange: (query: string) => void;
  focusId: string | null;
  onSuggestSource: (source: StageSheet, id: string) => void;
  searchWorker: (data: SheetData, id: string) => WorkerData | null;
  calculateBonus: (worker: WorkerData, start: Date, end: Date) => BonusResult;
};

const money = (value: number, type: 'amount' | 'percent' = 'amount') => type === 'percent'
  ? `${value.toFixed(2)}%` : `₦${new Intl.NumberFormat('en-NG', { maximumFractionDigits: 2 }).format(value)}`;

export function CollectorDirectory({ data, sourceLabel, source, sources, cycle, onCycleChange, query, onQueryChange, focusId, onSuggestSource, searchWorker, calculateBonus }: Props) {
  const [stage, setStage] = useState('All'), [generation, setGeneration] = useState('All');
  const [selected, setSelected] = useState<string | null>(null);
  const [swaps, setSwaps] = useState<IdSwap[] | null>(null), [swapError, setSwapError] = useState(false);
  const [retry, setRetry] = useState(0);
  const detailRef = useRef<HTMLElement>(null);
  const start = localDay(cycle.startDate.getTime()), end = localDay(cycle.endDate.getTime());
  const collectors = useMemo(() => listCollectors(data), [data]);
  const visible = useMemo(() => collectors.filter(c => (stage === 'All' || (c.stage || 'Unclassified') === stage) &&
    (generation === 'All' || (c.generation || 'Unknown') === generation) && c.id.includes(query.trim().toUpperCase())), [collectors, stage, generation, query]);
  const requestedId = query.trim().toUpperCase();
  const knownId = /^[A-Z]{2,8}(?:-?\d+-[ON]-[A-Z0-9-]+|-?\d{2,6})$/.test(requestedId) ? requestedId : selected;
  const suggestion = knownId ? suggestedStageSources(knownId, source, sources) : null;
  useEffect(() => {
    if (focusId && collectors.some(c => c.id === focusId)) setSelected(focusId);
  }, [focusId, collectors]);

  useEffect(() => {
    let cancelled = false;
    setSwaps(null); setSwapError(false);
    void (async () => {
      try {
        const { data: rows, error } = await supabase.from('id_swaps').select('*').order('effective_date', { ascending: true });
        if (error) throw error;
        if (!cancelled) setSwaps((rows || []) as unknown as IdSwap[]);
      } catch { if (!cancelled) setSwapError(true); }
    })();
    return () => { cancelled = true; };
  }, [retry]);

  const detail = useMemo(() => {
    if (!selected) return null;
    const find = (id: string) => {
      const worker = searchWorker(data, id);
      return worker ? calculateBonus(worker, cycle.startDate, cycle.endDate) : null;
    };
    const selectedWorker = searchWorker(data, selected);
    const raw = selectedWorker ? calculateBonus(selectedWorker, cycle.startDate, cycle.endDate) : null;
    const dates = selectedWorker?.dailyData.flatMap(day => typeof day.fullDate === 'number' && Number.isFinite(day.fullDate) ? [day.fullDate] : []) || [];
    const lastDate = dates.length ? Math.max(...dates) : null;
    const availableCycle = lastDate === null ? null : getCycleForDate(new Date(lastDate));
    if (!swaps) return { raw, availableCycle, history: null, parts: [], incomplete: false, mixed: false };
    const history = resolveCollectorHistory(selected, swaps, localDay(Date.now()));
    const ids = Object.keys(history.map).filter(id => windowIntersectsCycle(history.map, id, start, end));
    const parts = ids.map(id => {
      const result = id === selected ? raw : find(id);
      const days = result?.dailyBreakdown.filter(day => day.fullDate != null && ownedOn(history.map, id, localDay(day.fullDate))) || [];
      return { id, result, days, total: days.reduce((sum, day) => sum + day.value, 0) };
    });
    const incomplete = parts.some(p => !p.result || !p.days.length);
    const mixed = parts.some(p => p.result?.valueType === 'percent');
    return { raw, availableCycle, history, parts, incomplete, mixed };
  // Cycle boundaries are stable strings; a calculation is only repeated when its inputs change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, data, swaps, start, end, searchWorker, calculateBonus]);

  return <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
    <section className="min-w-0 rounded-xl border bg-card">
      <div className="space-y-3 border-b p-4">
        <div><h2 className="font-semibold">Collectors</h2><p className="text-xs text-muted-foreground">{collectors.length} recognized IDs in this tab</p></div>
        <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Filter by ID" value={query} onChange={e => { setSelected(null); onQueryChange(e.target.value); }} aria-label="Filter collectors by ID" /></div>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-muted-foreground">Stage<select value={stage} onChange={e => setStage(e.target.value)} className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm text-foreground"><option>All</option>{['T-1','T0','S1','S2','S3','Unclassified'].map(v => <option key={v}>{v}</option>)}</select></label>
          <label className="text-xs text-muted-foreground">ID type<select value={generation} onChange={e => setGeneration(e.target.value)} className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm text-foreground"><option>All</option><option>Old</option><option>New</option><option>Unknown</option></select></label>
        </div>
      </div>
      <div className="max-h-[400px] overflow-auto divide-y" aria-label="Collector list">
        {visible.map(c => <button type="button" key={c.id} onClick={() => {
          setSelected(c.id);
          if (window.matchMedia('(max-width: 1023px)').matches) requestAnimationFrame(() => detailRef.current?.scrollIntoView({ block: 'start', behavior: 'auto' }));
        }} aria-pressed={selected === c.id} className={`flex w-full items-center justify-between gap-2 px-4 py-3 text-left hover:bg-muted/50 ${selected === c.id ? 'bg-primary/10' : ''}`}><span className="min-w-0"><span className="block break-all text-sm font-medium">{c.id}</span><span className="text-xs text-muted-foreground">{c.stage || 'Unclassified'} · {c.generation || 'Unknown type'}</span></span><ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" /></button>)}
        {!visible.length && <div className="p-4 text-sm text-muted-foreground"><p>{collectors.length ? 'No IDs match these filters in this tab.' : 'No supported collector IDs found in this tab.'}</p>{(stage !== 'All' || generation !== 'All') && <Button variant="link" className="h-auto px-0" onClick={() => { setStage('All'); setGeneration('All'); }}>Clear stage and ID type filters</Button>}</div>}
      </div>
      {suggestion && knownId && <div className="border-t bg-amber-500/10 p-4 text-sm"><p><strong>{knownId}</strong> looks like {suggestion.stage}, while this source is labelled {source?.stage}. The ID may be in another source.</p>{suggestion.sources.length ? suggestion.sources.map(candidate => <Button key={`${candidate.stage}:${candidate.spreadsheetId}`} variant="outline" size="sm" className="mt-2 mr-2 h-auto whitespace-normal text-left" onClick={() => onSuggestSource(candidate, knownId)}>Check {candidate.stage}{candidate.label ? ` — ${candidate.label}` : ''} spreadsheet</Button>) : <p className="mt-2 text-xs">No enabled {suggestion.stage} spreadsheet was identified from the source labels. Check the source or ask your admin.</p>}<p className="mt-2 text-xs text-muted-foreground">Source labels are a guide; the ID has not been checked in another spreadsheet yet.</p></div>}
    </section>
    <section ref={detailRef} className="min-w-0 rounded-xl border bg-card p-4 sm:p-5" aria-live="polite">
      {!selected || !detail ? <div className="flex min-h-52 items-center justify-center text-center text-sm text-muted-foreground">Select a collector to view their earnings.</div> : <>
        <div><p className="text-xs text-muted-foreground">{sourceLabel} · {data.sheetName}</p><h2 className="mt-1 break-all text-lg font-semibold">{selected}</h2><p className="text-sm text-muted-foreground">Selected cycle · {cycle.label}</p></div>
        <div className="mt-5 rounded-lg bg-muted/40 p-4"><p className="text-xs text-muted-foreground">This ID's sheet earnings</p>{detail.raw?.dailyBreakdown.length ? <p className="mt-1 text-2xl font-semibold">{money(detail.raw.totalBonus, detail.raw.valueType)}</p> : <p className="mt-1 text-sm">No readable dated earnings for this ID in this cycle.</p>}<p className="mt-1 text-xs text-muted-foreground">Raw sheet data for this ID; not adjusted for ID changes or transfers. Totals reflect readable dates only.</p>{detail.raw?.dailyBreakdown.length > 0 && detail.raw.dateWarning && <p className="mt-2 text-xs text-muted-foreground">{detail.raw.dateWarning}</p>}</div>
        {!detail.raw?.dailyBreakdown.length && detail.availableCycle && getCycleKey(detail.availableCycle) !== getCycleKey(cycle) && <div className="mt-3 rounded-lg border p-3 text-sm"><p>This ID has readable dates in {detail.availableCycle.label} in this tab. The selected cycle may not have data here yet.</p><Button variant="outline" size="sm" className="mt-2 h-auto whitespace-normal text-left" onClick={() => onCycleChange(detail.availableCycle!)}>View {detail.availableCycle.label}</Button></div>}
        {!swaps && !swapError && <p className="mt-4 text-sm text-muted-foreground">Checking ID change history…</p>}
        {swapError && <div className="mt-4 rounded-lg border border-amber-500/50 p-3 text-sm">Could not check ID change history. Combined earnings are unavailable. <Button variant="link" className="h-auto p-0" onClick={() => setRetry(n => n + 1)}>Retry</Button></div>}
        {detail.history && !detail.history.ambiguous && detail.history.chain.length === 0 && <p className="mt-4 text-xs text-muted-foreground">No recorded ID changes for this collector.</p>}
        {detail.history?.ambiguous && <p className="mt-4 rounded-lg border border-amber-500/50 p-3 text-sm">ID change history is ambiguous. Combined earnings are unavailable until the records are checked.</p>}
        {detail.history && !detail.history.ambiguous && detail.history.chain.length > 0 && <div className="mt-5 space-y-3">
          <div><h3 className="font-semibold">Collector's combined earnings</h3><p className="text-xs text-muted-foreground">Current ID: {detail.history.currentId}. Each ID is included only for dates this collector held it.</p></div>
          {detail.history.chain.map(change => <p key={change.id} className="break-words rounded-md bg-muted/40 p-2 text-xs">{change.old_worker_id} → {change.new_worker_id} · from {change.effective_date}</p>)}
          {/WEEKLY/i.test(data.sheetName) || detail.mixed ? <p className="text-sm text-muted-foreground">Combined earnings aren't available for weekly or percentage-based data because ownership can't be safely allocated from these totals.</p> : <>
            <div className="divide-y rounded-lg border">{detail.parts.map(p => <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm"><span className="break-all">{p.id} <span className="text-xs text-muted-foreground">· owned dates in cycle</span></span><span className="font-medium">{p.days.length ? money(p.total, p.result?.valueType) : 'No readable owned days'}</span></div>)}</div>
            {detail.incomplete || !detail.parts.length ? <p className="text-sm text-amber-700 dark:text-amber-400">Combined total unavailable: at least one relevant ID has no readable dated data in this tab. Check the sheet or another tab.</p> : <div className="flex items-center justify-between gap-3 rounded-lg bg-primary/10 p-3"><span className="text-sm font-medium">Combined total</span><span className="text-lg font-semibold">{money(detail.parts.reduce((sum,p) => sum + p.total, 0))}</span></div>}
            <p className="text-xs text-muted-foreground">Selected tab and readable dates only. Missing dates may make totals incomplete. Day transfers and deductions are not included.</p>
            {detail.parts.some(p => p.days.length > 0) && <div><h4 className="mb-2 text-sm font-semibold">Combined daily breakdown</h4><div className="divide-y rounded-lg border">{detail.parts.flatMap(p => p.days.map(day => ({...day, id: p.id}))).sort((a,b) => (a.fullDate ?? 0) - (b.fullDate ?? 0)).map((day,i) => <div key={i} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm"><span>{day.date} <span className="break-all text-xs text-muted-foreground">· {day.id}</span></span><span>{money(day.value)}</span>{(day.bonus !== undefined || day.rankingBonus !== undefined) && <span className="w-full text-xs text-muted-foreground">Bonus {money(day.bonus ?? 0)} · Ranking {money(day.rankingBonus ?? 0)}</span>}</div>)}</div></div>}

          </>}
        </div>}
        {detail.raw && detail.raw.dailyBreakdown.length > 0 && <div className="mt-5"><h3 className="mb-2 text-sm font-semibold">Daily breakdown · {selected}</h3><div className="divide-y rounded-lg border">{detail.raw.dailyBreakdown.map((day,i) => <div key={i} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm"><span>{day.date}</span><span>{money(day.value, detail.raw?.valueType)}</span>{(day.bonus !== undefined || day.rankingBonus !== undefined) && <span className="w-full text-xs text-muted-foreground">Bonus {money(day.bonus ?? 0)} · Ranking {money(day.rankingBonus ?? 0)}</span>}</div>)}</div></div>}
      </>}
    </section>
  </div>;
}
