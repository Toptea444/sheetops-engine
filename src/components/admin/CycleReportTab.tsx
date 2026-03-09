import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  BarChart3, RefreshCw, TrendingUp, Users, ArrowLeftRight, Calendar,
  ChevronDown, Trophy, ArrowDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAdminData } from '@/hooks/useAdminData';
import { formatNaira } from '@/utils/currencyUtils';
import { getCycleOptions, getCycleKey } from '@/lib/cycleUtils';

interface Props {
  adminSecret: string;
}

export function CycleReportTab({ adminSecret }: Props) {
  const { adminRequest, isLoading } = useAdminData();
  const [data, setData] = useState<any>(null);
  const cycleOptions = useMemo(() => getCycleOptions(6), []);
  const [selectedCycleIdx, setSelectedCycleIdx] = useState(0);
  const selectedCycleKey = getCycleKey(cycleOptions[selectedCycleIdx]);
  const [showCycleDropdown, setShowCycleDropdown] = useState(false);

  const load = useCallback(async () => {
    const res = await adminRequest(adminSecret, 'get_cycle_report', { cycle_key: selectedCycleKey });
    if (res) setData(res);
  }, [adminRequest, adminSecret, selectedCycleKey]);

  useEffect(() => { load(); }, [load]);

  if (!data && isLoading) {
    return <div className="flex items-center justify-center py-12"><RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Cycle Selector */}
      <div className="relative">
        <Button variant="outline" size="sm" className="w-full justify-between text-xs"
          onClick={() => setShowCycleDropdown(!showCycleDropdown)}>
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            <span>{cycleOptions[selectedCycleIdx].label}</span>
          </div>
          <ChevronDown className={`h-3 w-3 ml-1 opacity-50 transition-transform ${showCycleDropdown ? 'rotate-180' : ''}`} />
        </Button>
        {showCycleDropdown && (
          <Card className="absolute top-full left-0 right-0 mt-1 z-50 shadow-lg">
            <div className="py-1 max-h-[200px] overflow-y-auto">
              {cycleOptions.map((c, idx) => (
                <button key={getCycleKey(c)} onClick={() => { setSelectedCycleIdx(idx); setShowCycleDropdown(false); }}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-muted/50 ${selectedCycleIdx === idx ? 'bg-accent font-medium' : ''}`}>
                  {c.label} {idx === 0 && <Badge variant="secondary" className="text-[9px] h-4 ml-1">Current</Badge>}
                </button>
              ))}
            </div>
          </Card>
        )}
      </div>

      {data && (
        <>
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

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="pt-3 pb-2.5 px-4">
                <div className="flex items-center gap-2">
                  <ArrowLeftRight className="h-3.5 w-3.5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Swaps / Transfers</p>
                    <p className="text-sm font-semibold">{data.total_swaps} / {data.total_transfers}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-3 pb-2.5 px-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Sheets</p>
                    <p className="text-sm font-semibold">{data.by_sheet?.length || 0}</p>
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
                <div className="space-y-1">
                  {data.top_earners?.map((w: any, i: number) => (
                    <div key={w.worker_id} className="flex items-center justify-between py-2 px-2 rounded-md hover:bg-muted/50">
                      <div className="flex items-center gap-2.5">
                        <span className={`text-xs font-bold w-5 text-center ${i < 3 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                          {i + 1}
                        </span>
                        <span className="text-sm font-mono font-medium">{w.worker_id}</span>
                      </div>
                      <span className="text-sm font-mono font-bold">{formatNaira(w.total)}</span>
                    </div>
                  ))}
                  {(!data.top_earners || data.top_earners.length === 0) && (
                    <p className="text-xs text-muted-foreground text-center py-4">No cached data for this cycle</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Bottom Earners */}
          {data.bottom_earners?.length > 0 && (
            <Card>
              <CardHeader className="py-2.5 px-3">
                <CardTitle className="text-xs flex items-center gap-1.5">
                  <ArrowDown className="h-3.5 w-3.5 text-red-500" />Bottom 5 Earners
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="space-y-1">
                  {data.bottom_earners.map((w: any) => (
                    <div key={w.worker_id} className="flex items-center justify-between py-2 px-2 rounded-md hover:bg-muted/50">
                      <span className="text-sm font-mono">{w.worker_id}</span>
                      <span className="text-sm font-mono font-semibold text-red-500">{formatNaira(w.total)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sheet Breakdown */}
          <Card>
            <CardHeader className="py-2.5 px-3">
              <CardTitle className="text-xs flex items-center gap-1.5">
                <BarChart3 className="h-3.5 w-3.5" />Per-Sheet Totals
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="space-y-2">
                {data.by_sheet?.map((s: any) => {
                  const pct = data.grand_total > 0 ? (s.total / data.grand_total) * 100 : 0;
                  return (
                    <div key={s.sheet}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium truncate max-w-[180px]">{s.sheet}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[10px] h-4">{s.worker_count} workers</Badge>
                          <span className="font-mono font-semibold">{formatNaira(s.total)}</span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary/60" style={{ width: `${Math.max(2, pct)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <Button variant="outline" size="sm" onClick={load} disabled={isLoading}>
        <RefreshCw className={`h-3 w-3 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />Refresh
      </Button>
    </div>
  );
}
