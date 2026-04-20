import { useState, useCallback } from 'react';
import { Database, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useGoogleSheets } from '@/hooks/useGoogleSheets';
import { useCycleCache } from '@/hooks/useCycleCache';
import { getCycleOptions, getCycleKey, isDateInCycle } from '@/lib/cycleUtils';
import type { CyclePeriod } from '@/lib/cycleUtils';
import type { SheetData } from '@/types/bonus';
import { useToast } from '@/hooks/use-toast';

interface Props {
  cycle: CyclePeriod;
}

// Worker ID pattern: e.g. NGDS-1001, GHAS-1003, GHBS-1002, K-1001
const WORKER_ID_PATTERN = /^[A-Z]{1,6}-\d{2,6}$/;

/** Walk the full sheet matrix and collect every cell that looks like a worker ID. */
function extractWorkerIds(sheet: SheetData): string[] {
  const ids = new Set<string>();
  const matrix: string[][] = [sheet.headers, ...sheet.rows];
  for (const row of matrix) {
    for (const cell of row) {
      const v = String(cell ?? '').trim().toUpperCase();
      if (WORKER_ID_PATTERN.test(v)) ids.add(v);
    }
  }
  return [...ids];
}

/** Skip sheets that aren't part of the bonus pipeline. */
function isBonusSheet(name: string): boolean {
  const upper = name.toUpperCase();
  if (upper.includes('TRANSPORT') && upper.includes('SUBSIDY')) return false;
  return (
    upper.includes('DAILY') ||
    upper.includes('PERFORMANCE') ||
    upper.includes('RANKING') ||
    upper.includes('WEEKLY')
  );
}

export function BulkSnapshotButton({ cycle }: Props) {
  const { toast } = useToast();
  const { fetchSheets, fetchSheetData, searchWorker, calculateBonus } = useGoogleSheets();
  const { saveSheetSnapshot, saveWorkerResult, loadAllSheetSnapshots } = useCycleCache();

  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ stage: '', current: 0, total: 0 });
  const [lastResult, setLastResult] = useState<{
    sheets: number;
    workers: number;
    snapshots: number;
    fromCache: number;
    cycleLabel: string;
  } | null>(null);

  // Past cycles only — current cycle is already snapshotted live as users browse.
  const currentCycleKey = getCycleKey(getCycleOptions(0)[0]);
  const isCurrentCycle = getCycleKey(cycle) === currentCycleKey;
  const cycleKey = getCycleKey(cycle);

  const run = useCallback(async () => {
    setRunning(true);
    setLastResult(null);
    setProgress({ stage: 'Loading sheet list…', current: 0, total: 0 });

    try {
      // 1. Load enabled sheets from Google + already-cached snapshots from DB.
      //    Cached snapshots cover sheets that have since been disabled.
      const [allSheets, cachedSnapshots] = await Promise.all([
        fetchSheets(),
        loadAllSheetSnapshots(cycleKey),
      ]);

      const enabledBonusSheets = allSheets.filter(
        (s) => !s.disabled && isBonusSheet(s.name)
      );

      // Build a single map of every sheet we can use.
      // Live data (when available) takes priority over cached.
      const fetchedSheets: SheetData[] = [];
      let fromCacheCount = 0;
      const usedNames = new Set<string>();

      // 2a. Fetch enabled live sheets, save their snapshot.
      setProgress({
        stage: 'Fetching live sheets…',
        current: 0,
        total: enabledBonusSheets.length,
      });
      for (let i = 0; i < enabledBonusSheets.length; i++) {
        const sheet = enabledBonusSheets[i];
        setProgress({
          stage: `Fetching: ${sheet.name}`,
          current: i,
          total: enabledBonusSheets.length,
        });
        const data = await fetchSheetData(sheet.name);
        if (!data) continue;

        // Only keep sheets that actually have data inside this cycle window.
        // (Stops e.g. April sheet polluting the March cycle cache.)
        let hasInCycleData = false;
        for (const row of data.rows) {
          for (const cell of row) {
            const t = Date.parse(String(cell ?? ''));
            if (!isNaN(t) && isDateInCycle(new Date(t), cycle)) {
              hasInCycleData = true;
              break;
            }
          }
          if (hasInCycleData) break;
        }

        // Always include if cycle name appears in the sheet name (covers
        // sheets where the date column header is the only date marker).
        const nameUpper = sheet.name.toUpperCase();
        const cycleMonths = [
          cycle.startDate.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
          cycle.endDate.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
          cycle.startDate.toLocaleString('en-US', { month: 'long' }).toUpperCase(),
          cycle.endDate.toLocaleString('en-US', { month: 'long' }).toUpperCase(),
        ];
        const nameMatchesCycle = cycleMonths.some((m) => nameUpper.includes(m));

        if (!hasInCycleData && !nameMatchesCycle) continue;

        fetchedSheets.push(data);
        usedNames.add(sheet.name);
        await saveSheetSnapshot(sheet.name, cycle, data);
      }

      // 2b. Add cached snapshots for sheets we couldn't fetch live (disabled/removed).
      for (const [name, data] of Object.entries(cachedSnapshots)) {
        if (usedNames.has(name)) continue;
        if (!isBonusSheet(name)) continue;
        fetchedSheets.push(data);
        usedNames.add(name);
        fromCacheCount++;
      }

      if (fetchedSheets.length === 0) {
        toast({
          title: 'Nothing to snapshot',
          description: 'No live or cached bonus sheets matched this cycle.',
          variant: 'destructive',
        });
        return;
      }

      // 3. Collect every worker ID across all usable sheets
      const allWorkerIds = new Set<string>();
      for (const sheet of fetchedSheets) {
        for (const id of extractWorkerIds(sheet)) {
          allWorkerIds.add(id);
        }
      }

      // 4. For each worker, parse every sheet and save results
      const workerIds = [...allWorkerIds];
      let savedCount = 0;
      setProgress({ stage: 'Calculating worker results…', current: 0, total: workerIds.length });

      for (let w = 0; w < workerIds.length; w++) {
        const workerId = workerIds[w];
        setProgress({
          stage: `Worker ${w + 1} / ${workerIds.length}: ${workerId}`,
          current: w,
          total: workerIds.length,
        });

        for (const sheet of fetchedSheets) {
          const worker = searchWorker(sheet, workerId);
          if (!worker || worker.dailyData.length === 0) continue;

          const result = calculateBonus(worker, cycle.startDate, cycle.endDate);
          // Filter to days actually inside the cycle (defensive)
          const inCycleDays = (result.dailyBreakdown || []).filter((d) => {
            if (d.fullDate === undefined) return false;
            return isDateInCycle(new Date(d.fullDate), cycle);
          });
          if (inCycleDays.length === 0) continue;

          await saveWorkerResult(workerId, sheet.sheetName, cycle, {
            ...result,
            sheetName: sheet.sheetName,
          });
          savedCount++;
        }
      }

      setLastResult({
        sheets: fetchedSheets.length,
        workers: workerIds.length,
        snapshots: savedCount,
        fromCache: fromCacheCount,
        cycleLabel: cycle.label,
      });

      toast({
        title: 'Snapshot complete',
        description: `Saved ${savedCount} worker results across ${fetchedSheets.length} sheets (${fromCacheCount} from cache) for ${cycle.label}.`,
      });
    } catch (e: any) {
      toast({
        title: 'Snapshot failed',
        description: e?.message || 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setRunning(false);
      setProgress({ stage: '', current: 0, total: 0 });
    }
  }, [cycle, cycleKey, fetchSheets, fetchSheetData, searchWorker, calculateBonus, saveSheetSnapshot, saveWorkerResult, loadAllSheetSnapshots, toast]);

  return (
    <Card>
      <CardContent className="pt-3 pb-3 px-3 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 min-w-0">
            <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Database className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold">Snapshot cycle to database</p>
              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                Backfills every worker's results. Uses cached sheets when the original is disabled, and skips sheets that don't belong to this cycle.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant={isCurrentCycle ? 'outline' : 'default'}
            disabled={running}
            onClick={run}
            className="text-xs h-7 flex-shrink-0"
          >
            {running ? (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Working
              </>
            ) : (
              <>
                <Database className="h-3 w-3 mr-1" />
                Snapshot
              </>
            )}
          </Button>
        </div>

        {running && progress.stage && (
          <div className="space-y-1 pt-1 border-t">
            <p className="text-[10px] text-muted-foreground truncate">{progress.stage}</p>
            {progress.total > 0 && (
              <div className="h-1 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{
                    width: `${Math.min(100, Math.round((progress.current / progress.total) * 100))}%`,
                  }}
                />
              </div>
            )}
          </div>
        )}

        {!running && lastResult && (
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground pt-1 border-t">
            <CheckCircle2 className="h-3 w-3 text-primary" />
            <span>
              {lastResult.snapshots} results · {lastResult.workers} workers · {lastResult.sheets} sheets
              {lastResult.fromCache > 0 && ` (${lastResult.fromCache} from cache)`}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
