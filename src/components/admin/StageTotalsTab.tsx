import { useCallback, useEffect, useMemo, useState } from 'react';
import { Layers, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAdminData } from '@/hooks/useAdminData';
import { formatNaira } from '@/utils/currencyUtils';
import { getCycleKey, getCycleOptions } from '@/lib/cycleUtils';
import { Button } from '@/components/ui/button';

interface Props {
  adminSecret: string;
}

export function StageTotalsTab({ adminSecret }: Props) {
  const { adminRequest, isLoading } = useAdminData();
  const cycleOptions = useMemo(() => getCycleOptions(6), []);
  const [selectedCycleIdx, setSelectedCycleIdx] = useState(0);
  const selectedCycleKey = getCycleKey(cycleOptions[selectedCycleIdx]);
  const [data, setData] = useState<any>(null);

  const load = useCallback(async () => {
    const res = await adminRequest(adminSecret, 'get_cycle_stage_totals', {
      cycle_key: selectedCycleKey,
    });
    if (res) setData(res);
  }, [adminRequest, adminSecret, selectedCycleKey]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Cycle</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {cycleOptions.map((cycle, idx) => {
                  const key = getCycleKey(cycle);
                  const selected = idx === selectedCycleIdx;
                  return (
                    <Button
                      key={key}
                      variant={selected ? 'default' : 'outline'}
                      size="sm"
                      className="h-7 px-2 text-[11px]"
                      onClick={() => setSelectedCycleIdx(idx)}
                    >
                      {cycle.label}
                    </Button>
                  );
                })}
              </div>
            </div>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={load} disabled={isLoading}>
              {isLoading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              <span className="ml-1">Refresh</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <Layers className="h-4 w-4" />
            Stage Totals (all non-bonus sheets)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between rounded-lg border p-2.5 bg-muted/20">
            <span className="text-xs text-muted-foreground">Grand total</span>
            <span className="font-mono font-bold text-sm">{formatNaira(data?.grand_total || 0)}</span>
          </div>

          {!data?.by_stage?.length ? (
            <p className="text-xs text-muted-foreground py-6 text-center">No stage totals available for this cycle yet.</p>
          ) : (
            <div className="space-y-1.5">
              {data.by_stage.map((row: { stage: string; total: number }) => (
                <div key={row.stage} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <span className="text-sm font-medium">{row.stage}</span>
                  <span className="text-sm font-mono font-bold">{formatNaira(row.total)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
