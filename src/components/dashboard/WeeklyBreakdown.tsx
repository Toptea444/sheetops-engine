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
    return <div className="space-y-4"><Skeleton className="h-4 w-28" /><Skeleton className="h-[150px] w-full" /></div>;
  }

  const maxMagnitude = Math.max(...weekData.map((week) => Math.abs(week.total)), 1);
  const grandTotal = weekData.reduce((sum, week) => sum + week.total, 0);
  const isHidden = displayMode === 'dots';
  const hasNegative = weekData.some((week) => week.total < 0);
  const hasData = weekData.some((week) => week.total !== 0);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Weekly earnings</p>
          <p className="mt-1 text-xs text-muted-foreground">Earnings by week in this cycle</p>
        </div>
        {hasData && (isHidden ? (
          <span className="h-5 w-20 rounded bg-muted" aria-label="Weekly total hidden" />
        ) : (
          <span className="text-sm font-semibold tabular-nums">₦{grandTotal.toLocaleString()}</span>
        ))}
      </div>
      {!hasData ? (
        <div className="flex min-h-[190px] items-center justify-center text-sm text-muted-foreground">No earnings data for this cycle</div>
      ) : (
        <div className="mt-5 min-w-0 overflow-x-auto">
          <div className="flex min-w-max items-end justify-around gap-3" aria-label="Weekly earnings chart">
            {weekData.map((week) => {
              const positiveHeight = week.total > 0 ? Math.max(4, (week.total / maxMagnitude) * (hasNegative ? 70 : 140)) : 0;
              const negativeHeight = week.total < 0 ? Math.max(4, (Math.abs(week.total) / maxMagnitude) * 70) : 0;
              return (
                <div key={week.label} className="flex w-20 shrink-0 flex-col items-center">
                  <div className="mb-2 text-center text-xs font-medium tabular-nums">
                    {isHidden ? <span className="inline-block h-3 w-12 rounded bg-muted" aria-label={`${week.label} amount hidden`} /> : `₦${week.total.toLocaleString()}`}
                  </div>
                  <div className="flex w-full flex-col items-center" aria-hidden="true">
                    <div className="flex w-full items-end justify-center border-b border-border" style={{ height: hasNegative ? 70 : 140 }}>
                      <div className="w-8 rounded-t-md bg-primary/80" style={{ height: isHidden ? (hasNegative ? 35 : 70) : positiveHeight }} />
                    </div>
                    {hasNegative && <div className="flex h-[70px] w-full justify-center"><div className="w-8 rounded-b-md bg-destructive/70" style={{ height: isHidden ? 0 : negativeHeight }} /></div>}
                  </div>
                  <p className="mt-2 text-xs font-medium text-muted-foreground">{week.label}</p>
                  <p className="text-[11px] text-muted-foreground">{week.days} days</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
