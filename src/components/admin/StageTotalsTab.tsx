import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Layers, RefreshCw, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAdminData } from '@/hooks/useAdminData';
import { formatNaira } from '@/utils/currencyUtils';
import { getCycleKey, getCycleOptions } from '@/lib/cycleUtils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Props {
  adminSecret: string;
}

interface StageWorker {
  worker_id: string;
  total: number;
}

interface StageTotalsRow {
  stage: string;
  total: number;
  worker_count: number;
  workers: StageWorker[];
}

interface StageTotalsResponse {
  cycle_key: string;
  available_cycles: string[];
  grand_total: number;
  included_sheets: string[];
  excluded_sheet_keywords: string[];
  by_stage: StageTotalsRow[];
}

function StageRow({ row }: { row: StageTotalsRow }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card>
      <button className="w-full" onClick={() => setExpanded((prev) => !prev)}>
        <CardContent className="py-2.5 px-3">
          <div className="flex items-center justify-between">
            <div className="text-left">
              <p className="text-sm font-semibold">{row.stage}</p>
              <p className="text-[11px] text-muted-foreground">{row.worker_count} workers</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono font-bold">{formatNaira(row.total)}</span>
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </div>
          </div>
        </CardContent>
      </button>

      {expanded && (
        <CardContent className="pt-0 pb-3 px-3">
          <div className="rounded-lg border divide-y">
            {row.workers.map((worker) => (
              <div key={worker.worker_id} className="flex items-center justify-between px-3 py-2">
                <span className="text-sm font-mono">{worker.worker_id}</span>
                <span className="text-sm font-mono font-semibold">{formatNaira(worker.total)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export function StageTotalsTab({ adminSecret }: Props) {
  const { adminRequest, isLoading } = useAdminData();
  const fallbackCycleOptions = useMemo(() => getCycleOptions(6), []);
  const [selectedCycleKey, setSelectedCycleKey] = useState(() => getCycleKey(fallbackCycleOptions[0]));
  const [data, setData] = useState<StageTotalsResponse | null>(null);

  const cycleKeys = useMemo(() => {
    if (data?.available_cycles?.length) return data.available_cycles;
    return fallbackCycleOptions.map((cycle) => getCycleKey(cycle));
  }, [data?.available_cycles, fallbackCycleOptions]);

  const load = useCallback(async (cycleKeyOverride?: string) => {
    const cycleKey = cycleKeyOverride || selectedCycleKey;
    const res = await adminRequest(adminSecret, 'get_cycle_stage_totals', {
      cycle_key: cycleKey,
    });
    if (res) {
      setData(res as StageTotalsResponse);
    }
  }, [adminRequest, adminSecret, selectedCycleKey]);

  useEffect(() => {
    load(selectedCycleKey);
  }, [load, selectedCycleKey]);

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="pt-4 pb-3 space-y-3">
          <div>
            <p className="text-xs text-muted-foreground">Cycle</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {cycleKeys.map((cycleKey) => (
                <Button
                  key={cycleKey}
                  variant={selectedCycleKey === cycleKey ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 px-2 text-[11px]"
                  onClick={() => setSelectedCycleKey(cycleKey)}
                >
                  {cycleKey}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-2.5 bg-muted/20">
            <div>
              <p className="text-xs text-muted-foreground">Grand total (non-bonus sheets)</p>
              <p className="text-lg font-mono font-bold">{formatNaira(data?.grand_total || 0)}</p>
            </div>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => load()} disabled={isLoading}>
              {isLoading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              <span className="ml-1">Refresh</span>
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
            <Users className="h-3 w-3" />
            <span>{data?.by_stage?.reduce((sum, stage) => sum + stage.worker_count, 0) || 0} worker records</span>
            <Badge variant="outline" className="h-5 text-[10px]">
              excluding ranking/weekly bonus sheets
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <Layers className="h-4 w-4" />
            Workers grouped by stage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {!data?.by_stage?.length ? (
            <p className="text-xs text-muted-foreground py-6 text-center">No data available for this cycle yet.</p>
          ) : (
            <div className="space-y-2">
              {data.by_stage.map((row) => (
                <StageRow key={row.stage} row={row} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
