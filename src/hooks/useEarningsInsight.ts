import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { BonusResult } from '@/types/bonus';
import type { CyclePeriod } from '@/lib/cycleUtils';

export type InsightTone = 'positive' | 'neutral' | 'concern';
export interface Insight {
  insight: string;
  tone: InsightTone;
}

const CACHE_PREFIX = 'earnings_insight_v1:';

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function isDailyOrPerformance(name?: string) {
  if (!name) return false;
  const u = name.toUpperCase();
  return u.includes('DAILY') || u.includes('PERFORMANCE');
}

function pickPrimaryResult(results: BonusResult[]): BonusResult | null {
  // Prefer a Daily/Performance sheet with the most days worked.
  const candidates = results.filter((r) => isDailyOrPerformance(r.sheetName));
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => {
    const aw = a.dailyBreakdown.filter((d) => (d.value ?? 0) > 0).length;
    const bw = b.dailyBreakdown.filter((d) => (d.value ?? 0) > 0).length;
    return bw - aw;
  });
  return candidates[0];
}

function dataFingerprint(r: BonusResult): string {
  return r.dailyBreakdown
    .map((d) => `${d.date}:${Math.round(d.value || 0)}`)
    .join('|');
}

interface UseEarningsInsightArgs {
  results: BonusResult[];
  cycle: CyclePeriod;
  workerName?: string;
  enabled?: boolean;
}

export function useEarningsInsight({ results, cycle, workerName, enabled = true }: UseEarningsInsightArgs) {
  const [insight, setInsight] = useState<Insight | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const primary = pickPrimaryResult(results);
    if (!primary) {
      setInsight(null);
      return;
    }
    const worked = primary.dailyBreakdown.filter((d) => (d.value ?? 0) > 0).length;
    if (worked < 1) {
      setInsight(null);
      return;
    }

    const fp = dataFingerprint(primary);
    const cacheKey = `${CACHE_PREFIX}${primary.workerId}:${primary.sheetName}:${todayKey()}`;
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        const cached = JSON.parse(raw) as { fp: string; insight: Insight };
        if (cached.fp === fp) {
          setInsight(cached.insight);
          return;
        }
      }
    } catch {
      /* ignore */
    }

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const cycleEnd = cycle.endDate;
        const dailyEarnings = primary.dailyBreakdown.map((d) => ({
          date: d.date,
          value: d.value || 0,
        }));
        const totalSoFar = primary.totalBonus;
        const cycleEndStr = `${cycleEnd.getFullYear()}-${String(cycleEnd.getMonth() + 1).padStart(2, '0')}-${String(cycleEnd.getDate()).padStart(2, '0')}`;
        const { data, error } = await supabase.functions.invoke('earnings-insight', {
          body: {
            workerName: workerName || primary.userName,
            stage: primary.stage,
            sheetName: primary.sheetName,
            cycleLabel: cycle.label,
            totalSoFar,
            dailyEarnings,
            cycleEndDate: cycleEndStr,
          },
        });
        if (cancelled) return;
        if (error || !data?.insight) {
          setInsight(null);
        } else {
          const result: Insight = { insight: data.insight, tone: data.tone || 'neutral' };
          setInsight(result);
          try {
            localStorage.setItem(cacheKey, JSON.stringify({ fp, insight: result }));
          } catch {
            /* ignore */
          }
        }
      } catch {
        if (!cancelled) setInsight(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, results, cycle.startDate.getTime(), cycle.endDate.getTime(), workerName]);

  return { insight, loading };
}
