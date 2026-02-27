import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import type { BonusResult } from '@/types/bonus';
import type { CyclePeriod } from '@/lib/cycleUtils';
import { isDateInCycle } from '@/lib/cycleUtils';
import type { EarningsDisplayMode } from '@/hooks/useDisplayMode';

interface WeeklyBreakdownProps {
  results: BonusResult[];
  cycle: CyclePeriod;
  isLoading?: boolean;
  displayMode?: EarningsDisplayMode;
}

function normalizeSheetName(value?: string): string {
  return (value ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function isWeeklyBonusGhSheet(sheetName?: string): boolean {
  const n = normalizeSheetName(sheetName);
  return n.includes('WEEKLYBONUSGH') || n.includes('WEEKLYBGH') ||
    (n.includes('WEEKLY') && n.includes('BONUS') && n.includes('GH'));
}

interface WeekData {
  label: string;
  total: number;
  days: number;
}

function getWeeksFromCycle(cycle: CyclePeriod): { start: Date; end: Date; label: string }[] {
  const weeks: { start: Date; end: Date; label: string }[] = [];
  const cycleStart = new Date(cycle.startDate);
  const cycleEnd = new Date(cycle.endDate);
  let weekStart = new Date(cycleStart);
  let weekNum = 1;

  while (weekStart <= cycleEnd) {
    // Find next Saturday or cycle end
    const weekEnd = new Date(weekStart);
    // Advance to Saturday (day 6) or cycle end
    while (weekEnd.getDay() !== 6 && weekEnd < cycleEnd) {
      weekEnd.setDate(weekEnd.getDate() + 1);
    }
    if (weekEnd > cycleEnd) {
      weekEnd.setTime(cycleEnd.getTime());
    }

    weeks.push({
      start: new Date(weekStart),
      end: new Date(weekEnd),
      label: `Week ${weekNum}`,
    });

    weekNum++;
    weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() + 1);
  }

  return weeks;
}

export function WeeklyBreakdown({ results, cycle, isLoading, displayMode = 'amount' }: WeeklyBreakdownProps) {
  const weekData = useMemo(() => {
    const weeks = getWeeksFromCycle(cycle);

    // Collect all daily values (excluding percent sheets and Weekly Bonus GH)
    const dailyValues: { fullDate: number; value: number }[] = [];
    results.forEach((result) => {
      if (result.valueType === 'percent') return;
      if (isWeeklyBonusGhSheet(result.sheetName)) return;
      result.dailyBreakdown?.forEach((day) => {
        if (day.fullDate === undefined) return;
        const dayDate = new Date(day.fullDate);
        if (!isDateInCycle(dayDate, cycle)) return;
        dailyValues.push({ fullDate: day.fullDate, value: day.value });
      });
    });

    return weeks.map((week): WeekData => {
      const weekStart = week.start.getTime();
      const weekEnd = new Date(week.end.getFullYear(), week.end.getMonth(), week.end.getDate(), 23, 59, 59).getTime();

      let total = 0;
      const daysSet = new Set<number>();
      dailyValues.forEach(({ fullDate, value }) => {
        if (fullDate >= weekStart && fullDate <= weekEnd) {
          total += value;
          daysSet.add(new Date(fullDate).getDate());
        }
      });

      return {
        label: week.label,
        total,
        days: daysSet.size,
      };
    });
  }, [results, cycle]);

  if (isLoading) {
    return <Skeleton className="h-[140px] w-full" />;
  }

  const maxTotal = Math.max(...weekData.map((w) => w.total), 1);
  const grandTotal = weekData.reduce((sum, w) => sum + w.total, 0);

  const renderAmount = (amount: number) => {
    const formatted = `₦${amount.toLocaleString()}`;
    if (displayMode === 'dots') {
      return (
        <span className="inline-flex items-center gap-0.5">
          {Array.from({ length: formatted.length }).map((_, i) => (
            <span key={i} className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
          ))}
        </span>
      );
    }
    return formatted;
  };

  if (grandTotal === 0) {
    return (
      <div className="h-[120px] flex items-center justify-center text-sm text-muted-foreground border rounded-md bg-muted/20">
        No earnings data for this cycle
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Weekly Breakdown</p>
      <div className="space-y-2">
        {weekData.map((week) => {
          const pct = maxTotal > 0 ? (week.total / maxTotal) * 100 : 0;
          return (
            <div key={week.label} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">{week.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">{week.days}d</span>
                  <span className="font-semibold tabular-nums">
                    {renderAmount(week.total)}
                  </span>
                </div>
              </div>
              <div className="h-2 w-full rounded-full bg-muted/40 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${Math.max(pct, week.total > 0 ? 2 : 0)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-end pt-1 border-t border-border/50">
        <span className="text-xs font-semibold tabular-nums">
          Total: {renderAmount(grandTotal)}
        </span>
      </div>
    </div>
  );
}
