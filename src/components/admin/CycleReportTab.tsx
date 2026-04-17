import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  BarChart3, RefreshCw, TrendingUp, Users, ArrowLeftRight, Calendar,
  ChevronDown, ChevronUp, Trophy, ArrowDown, Layers, Target, Hash,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAdminData } from '@/hooks/useAdminData';
import { formatNaira } from '@/utils/currencyUtils';
import { getCycleOptions, getCycleKey } from '@/lib/cycleUtils';
import { BulkSnapshotButton } from './BulkSnapshotButton';

interface Props {
  adminSecret: string;
}

// ─── Cycle Selector (reusable) ───────────────────────────────
function CycleDropdown({ cycleOptions, selectedIdx, onSelect }: {
  cycleOptions: ReturnType<typeof getCycleOptions>;
  selectedIdx: number;
  onSelect: (idx: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <Button variant="outline" size="sm" className="w-full justify-between text-xs"
        onClick={() => setOpen(!open)}>
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3 w-3 text-muted-foreground" />
          <span>{cycleOptions[selectedIdx].label}</span>
        </div>
        <ChevronDown className={`h-3 w-3 ml-1 opacity-50 transition-transform ${open ? 'rotate-180' : ''}`} />
      </Button>
      {open && (
        <Card className="absolute top-full left-0 right-0 mt-1 z-50 shadow-lg">
          <div className="py-1 max-h-[200px] overflow-y-auto">
            {cycleOptions.map((c, idx) => (
              <button key={getCycleKey(c)} onClick={() => { onSelect(idx); setOpen(false); }}
                className={`w-full text-left px-3 py-2 text-xs hover:bg-muted/50 ${selectedIdx === idx ? 'bg-accent font-medium' : ''}`}>
                {c.label} {idx === 0 && <Badge variant="secondary" className="text-[9px] h-4 ml-1">Current</Badge>}
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Worker Ranking List ─────────────────────────────────────
function RankingList({ workers, variant = 'top' }: { workers: any[]; variant?: 'top' | 'bottom' }) {
  if (!workers?.length) return <p className="text-xs text-muted-foreground text-center py-4">No data</p>;
  return (
    <div className="space-y-0.5">
      {workers.map((w: any, i: number) => (
        <div key={w.worker_id} className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50">
          <div className="flex items-center gap-2">
            {variant === 'top' && (
              <span className={`text-xs font-bold w-5 text-center ${i < 3 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                {i + 1}
              </span>
            )}
            <span className="text-sm font-mono font-medium">{w.worker_id}</span>
            {w.stage && w.stage !== 'UNKNOWN' && (
              <Badge variant="outline" className="text-[9px] h-4">{w.stage}</Badge>
            )}
          </div>
          <span className={`text-sm font-mono font-bold ${variant === 'bottom' ? 'text-destructive' : ''}`}>
            {formatNaira(w.total)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Stage Card ──────────────────────────────────────────────
function StageCard({ stage }: { stage: any }) {
  const [expanded, setExpanded] = useState(false);
  const pctOfTotal = stage._grandTotal > 0 ? ((stage.total / stage._grandTotal) * 100).toFixed(1) : '0';

  return (
    <Card>
      <button onClick={() => setExpanded(!expanded)} className="w-full text-left">
        <CardHeader className="py-2.5 px-3">
          <CardTitle className="text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center">
                <Layers className="h-3.5 w-3.5 text-primary" />
              </div>
              <div>
                <span className="text-sm font-semibold">{stage.stage}</span>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-normal mt-0.5">
                  <span>{stage.worker_count} workers</span>
                  <span>·</span>
                  <span>{pctOfTotal}% of total</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono font-bold text-foreground">{formatNaira(stage.total)}</span>
              {expanded ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
            </div>
          </CardTitle>
        </CardHeader>
      </button>

      {expanded && (
        <CardContent className="px-3 pb-3 space-y-3 border-t">
          {/* Stage quick stats */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            <div className="rounded-lg border bg-muted/30 p-2 text-center">
              <p className="text-[10px] text-muted-foreground">Total</p>
              <p className="text-xs font-bold font-mono">{formatNaira(stage.total)}</p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-2 text-center">
              <p className="text-[10px] text-muted-foreground">Average</p>
              <p className="text-xs font-bold font-mono">{formatNaira(stage.avg_earning)}</p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-2 text-center">
              <p className="text-[10px] text-muted-foreground">Workers</p>
              <p className="text-xs font-bold">{stage.worker_count}</p>
            </div>
          </div>

          {/* Top performers in stage */}
          {stage.top_earners?.length > 0 && (
            <div>
              <p className="text-[10px] font-medium text-muted-foreground mb-1 flex items-center gap-1">
                <Trophy className="h-2.5 w-2.5 text-amber-500" />Top Performers
              </p>
              <RankingList workers={stage.top_earners} variant="top" />
            </div>
          )}

          {/* Bottom performers in stage */}
          {stage.bottom_earners?.length > 0 && (
            <div>
              <p className="text-[10px] font-medium text-muted-foreground mb-1 flex items-center gap-1">
                <ArrowDown className="h-2.5 w-2.5 text-destructive" />Lowest Performers
              </p>
              <RankingList workers={stage.bottom_earners} variant="bottom" />
            </div>
          )}

          {/* Per-sheet in stage */}
          {stage.by_sheet?.length > 0 && (
            <div>
              <p className="text-[10px] font-medium text-muted-foreground mb-1 flex items-center gap-1">
                <BarChart3 className="h-2.5 w-2.5" />Sheet Breakdown
              </p>
              <div className="space-y-1.5">
                {stage.by_sheet.map((s: any) => {
                  const pct = stage.total > 0 ? (s.total / stage.total) * 100 : 0;
                  return (
                    <div key={s.sheet}>
                      <div className="flex items-center justify-between text-xs mb-0.5">
                        <span className="truncate max-w-[160px]">{s.sheet}</span>
                        <span className="font-mono font-semibold">{formatNaira(s.total)}</span>
                      </div>
                      <div className="h-1 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary/60" style={{ width: `${Math.max(2, pct)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ─── Main Report Tab ─────────────────────────────────────────
export function CycleReportTab({ adminSecret }: Props) {
  const { adminRequest, isLoading } = useAdminData();
  const [data, setData] = useState<any>(null);
  const cycleOptions = useMemo(() => getCycleOptions(6), []);
  const [selectedCycleIdx, setSelectedCycleIdx] = useState(0);
  const selectedCycleKey = getCycleKey(cycleOptions[selectedCycleIdx]);

  const load = useCallback(async () => {
    const res = await adminRequest(adminSecret, 'get_cycle_report', { cycle_key: selectedCycleKey });
    if (res) setData(res);
  }, [adminRequest, adminSecret, selectedCycleKey]);

  useEffect(() => { load(); }, [load]);

  if (!data && isLoading) {
    return <div className="flex items-center justify-center py-12"><RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  // Add grandTotal reference to each stage for % calculation
  const stagesWithRef = data?.by_stage?.map((s: any) => ({ ...s, _grandTotal: data.grand_total })) || [];

  return (
    <div className="space-y-4">
      <CycleDropdown cycleOptions={cycleOptions} selectedIdx={selectedCycleIdx} onSelect={setSelectedCycleIdx} />

      <BulkSnapshotButton cycle={cycleOptions[selectedCycleIdx]} />

      {data && (
        <Tabs defaultValue="overview" className="space-y-3">
          <TabsList className="grid w-full grid-cols-3 h-8">
            <TabsTrigger value="overview" className="text-xs gap-1">
              <TrendingUp className="h-3 w-3" />Overview
            </TabsTrigger>
            <TabsTrigger value="stages" className="text-xs gap-1">
              <Layers className="h-3 w-3" />By Stage
            </TabsTrigger>
            <TabsTrigger value="sheets" className="text-xs gap-1">
              <BarChart3 className="h-3 w-3" />By Sheet
            </TabsTrigger>
          </TabsList>

          {/* ─── Overview Tab ─────────────────────────── */}
          <TabsContent value="overview" className="space-y-3">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Grand Total</p>
                      <p className="text-xl font-bold">{formatNaira(data.grand_total)}</p>
                    </div>
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <TrendingUp className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Workers</p>
                      <p className="text-xl font-bold">{data.total_workers}</p>
                      <p className="text-[10px] text-muted-foreground">Avg: {formatNaira(data.avg_earning)}</p>
                    </div>
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick stats row */}
            <div className="grid grid-cols-3 gap-2">
              <Card>
                <CardContent className="pt-3 pb-2.5 px-3">
                  <div className="flex items-center gap-1.5">
                    <Layers className="h-3 w-3 text-muted-foreground" />
                    <div>
                      <p className="text-[10px] text-muted-foreground">Stages</p>
                      <p className="text-sm font-semibold">{data.by_stage?.length || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-3 pb-2.5 px-3">
                  <div className="flex items-center gap-1.5">
                    <ArrowLeftRight className="h-3 w-3 text-muted-foreground" />
                    <div>
                      <p className="text-[10px] text-muted-foreground">Swaps / Transfers</p>
                      <p className="text-sm font-semibold">{data.total_swaps} / {data.total_transfers}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-3 pb-2.5 px-3">
                  <div className="flex items-center gap-1.5">
                    <Target className="h-3 w-3 text-muted-foreground" />
                    <div>
                      <p className="text-[10px] text-muted-foreground">Recovered</p>
                      <p className="text-sm font-semibold">{formatNaira(data.total_transfer_amount || 0)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Earners */}
            <Card>
              <CardHeader className="py-2.5 px-3">
                <CardTitle className="text-xs flex items-center gap-1.5">
                  <Trophy className="h-3.5 w-3.5 text-amber-500" />Top 10 Earners
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <ScrollArea className="h-[250px]">
                  <RankingList workers={data.top_earners} variant="top" />
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Bottom Earners */}
            {data.bottom_earners?.length > 0 && (
              <Card>
                <CardHeader className="py-2.5 px-3">
                  <CardTitle className="text-xs flex items-center gap-1.5">
                    <ArrowDown className="h-3.5 w-3.5 text-destructive" />Bottom 5 Earners
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <RankingList workers={data.bottom_earners} variant="bottom" />
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ─── Stages Tab ───────────────────────────── */}
          <TabsContent value="stages" className="space-y-3">
            {stagesWithRef.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No stage data available for this cycle</p>
            ) : (
              <>
                {/* Stage summary bar */}
                <Card>
                  <CardContent className="pt-3 pb-3 px-3">
                    <p className="text-[10px] text-muted-foreground mb-2 font-medium">Stage Distribution</p>
                    <div className="flex rounded-full overflow-hidden h-3">
                      {stagesWithRef.map((s: any, i: number) => {
                        const pct = data.grand_total > 0 ? (s.total / data.grand_total) * 100 : 0;
                        const colors = ['bg-primary', 'bg-primary/70', 'bg-primary/50', 'bg-primary/30', 'bg-muted-foreground/40', 'bg-muted-foreground/25'];
                        return (
                          <div
                            key={s.stage}
                            className={`${colors[i % colors.length]} transition-all`}
                            style={{ width: `${Math.max(2, pct)}%` }}
                            title={`${s.stage}: ${pct.toFixed(1)}%`}
                          />
                        );
                      })}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {stagesWithRef.map((s: any, i: number) => {
                        const pct = data.grand_total > 0 ? ((s.total / data.grand_total) * 100).toFixed(1) : '0';
                        return (
                          <div key={s.stage} className="flex items-center gap-1 text-[10px]">
                            <div className={`h-2 w-2 rounded-full ${['bg-primary', 'bg-primary/70', 'bg-primary/50', 'bg-primary/30', 'bg-muted-foreground/40', 'bg-muted-foreground/25'][i % 6]}`} />
                            <span className="font-medium">{s.stage}</span>
                            <span className="text-muted-foreground">({pct}%)</span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Individual stage cards */}
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {stagesWithRef.map((stage: any) => (
                      <StageCard key={stage.stage} stage={stage} />
                    ))}
                  </div>
                </ScrollArea>
              </>
            )}
          </TabsContent>

          {/* ─── Sheets Tab ───────────────────────────── */}
          <TabsContent value="sheets" className="space-y-3">
            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {data.by_sheet?.map((s: any) => {
                  const pct = data.grand_total > 0 ? (s.total / data.grand_total) * 100 : 0;
                  const transferInfo = data.transfers_by_sheet?.[s.sheet];
                  return (
                    <Card key={s.sheet}>
                      <CardContent className="pt-3 pb-3 px-3">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="font-medium truncate max-w-[180px]">{s.sheet}</span>
                          <span className="font-mono font-bold">{formatNaira(s.total)}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-2">
                          <div className="h-full rounded-full bg-primary/60" style={{ width: `${Math.max(2, pct)}%` }} />
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-0.5">
                            <Users className="h-2.5 w-2.5" />{s.worker_count} workers
                          </span>
                          <span>{pct.toFixed(1)}% of total</span>
                          {transferInfo && (
                            <span className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
                              <ArrowLeftRight className="h-2.5 w-2.5" />
                              {transferInfo.count} transfers ({formatNaira(transferInfo.total_amount)})
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {(!data.by_sheet || data.by_sheet.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-8">No sheet data for this cycle</p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      )}

      <Button variant="outline" size="sm" onClick={load} disabled={isLoading}>
        <RefreshCw className={`h-3 w-3 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />Refresh
      </Button>
    </div>
  );
}
