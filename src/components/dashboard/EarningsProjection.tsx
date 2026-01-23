import { TrendingUp, Target, Calendar, ArrowUpRight } from 'lucide-react';
import { useMemo } from 'react';
import type { BonusResult } from '@/types/bonus';
import type { CyclePeriod } from '@/lib/cycleUtils';
import { isDateInCycle } from '@/lib/cycleUtils';

interface EarningsProjectionProps {
  results: BonusResult[];
  cycle: CyclePeriod;
  cycleTarget: number;
  isLoading?: boolean;
}

export function EarningsProjection({
  results,
  cycle,
  cycleTarget,
  isLoading,
}: EarningsProjectionProps) {
  const projectionData = useMemo(() => {
    // Calculate current earnings and days worked in cycle
    let currentEarnings = 0;
    const workDays = new Set<string>();
    const dailyEarnings: number[] = [];

    results.forEach((result) => {
      if (result.valueType === 'percent') return;

      result.dailyBreakdown?.forEach((day) => {
        if (day.fullDate === undefined) return;

        const dayDate = new Date(day.fullDate);
        if (isDateInCycle(dayDate, cycle) && day.value > 0) {
          currentEarnings += day.value;
          const dateKey = day.fullDate.toString();
          if (!workDays.has(dateKey)) {
            workDays.add(dateKey);
            dailyEarnings.push(day.value);
          } else {
            // Add to last entry if same day
            dailyEarnings[dailyEarnings.length - 1] += day.value;
          }
        }
      });
    });

    const daysWorked = workDays.size;

    if (daysWorked === 0) {
      return {
        projectedTotal: 0,
        dailyAverage: 0,
        daysRemaining: 0,
        projectedRemaining: 0,
        onTrack: false,
        percentComplete: 0,
        trend: 'neutral' as const,
      };
    }

    // Calculate days remaining in cycle
    const today = new Date();
    const cycleEnd = new Date(cycle.endDate);
    const daysRemaining = Math.max(
      0,
      Math.ceil((cycleEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    );

    // Calculate daily average
    const dailyAverage = currentEarnings / daysWorked;

    // Project remaining earnings (assume similar work pattern)
    // Estimate work days remaining based on work rate
    const cycleStart = new Date(cycle.startDate);
    const totalCycleDays = Math.ceil(
      (cycleEnd.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24)
    );
    const daysElapsed = totalCycleDays - daysRemaining;
    const workRate = daysWorked / Math.max(daysElapsed, 1);
    const estimatedWorkDaysRemaining = Math.round(daysRemaining * workRate);

    const projectedRemaining = dailyAverage * estimatedWorkDaysRemaining;
    const projectedTotal = currentEarnings + projectedRemaining;

    // Determine if on track for target
    const onTrack = cycleTarget > 0 ? projectedTotal >= cycleTarget : true;
    const percentComplete =
      cycleTarget > 0 ? (currentEarnings / cycleTarget) * 100 : 0;

    // Calculate trend from last 3 days vs previous 3 days
    let trend: 'up' | 'down' | 'neutral' = 'neutral';
    if (dailyEarnings.length >= 6) {
      const recent = dailyEarnings.slice(-3).reduce((a, b) => a + b, 0) / 3;
      const previous = dailyEarnings.slice(-6, -3).reduce((a, b) => a + b, 0) / 3;
      if (recent > previous * 1.1) trend = 'up';
      else if (recent < previous * 0.9) trend = 'down';
    }

    return {
      projectedTotal,
      dailyAverage,
      daysRemaining,
      projectedRemaining,
      onTrack,
      percentComplete,
      trend,
    };
  }, [results, cycle, cycleTarget]);

  if (isLoading) {
    return (
      <div className="p-4 rounded-lg bg-muted/30 animate-pulse">
        <div className="h-20 bg-muted rounded" />
      </div>
    );
  }

  const {
    projectedTotal,
    dailyAverage,
    daysRemaining,
    onTrack,
    percentComplete,
    trend,
  } = projectionData;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-primary" />
        <p className="text-sm font-medium">Earnings Projection</p>
      </div>

      {/* Projected Total */}
      <div className="p-3 rounded-lg bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Projected by cycle end</p>
            <p className="text-xl font-bold">₦{Math.round(projectedTotal).toLocaleString()}</p>
          </div>
          <div
            className={`
              h-10 w-10 rounded-full flex items-center justify-center
              ${trend === 'up' ? 'bg-success/20 text-success' : ''}
              ${trend === 'down' ? 'bg-destructive/20 text-destructive' : ''}
              ${trend === 'neutral' ? 'bg-muted text-muted-foreground' : ''}
            `}
          >
            <ArrowUpRight
              className={`h-5 w-5 ${trend === 'down' ? 'rotate-90' : ''} ${
                trend === 'neutral' ? 'rotate-45' : ''
              }`}
            />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2.5 rounded-lg bg-muted/30 border">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Target className="h-3 w-3" />
            Daily Avg
          </p>
          <p className="text-base font-semibold">
            ₦{Math.round(dailyAverage).toLocaleString()}
          </p>
        </div>
        <div className="p-2.5 rounded-lg bg-muted/30 border">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Days Left
          </p>
          <p className="text-base font-semibold">{daysRemaining}</p>
        </div>
      </div>

      {/* Target Status */}
      {cycleTarget > 0 && (
        <div
          className={`
            p-2.5 rounded-lg border text-center
            ${
              onTrack
                ? 'bg-success/10 border-success/30 text-success'
                : 'bg-warning/10 border-warning/30 text-warning'
            }
          `}
        >
          <p className="text-sm font-medium">
            {onTrack ? '✓ On track for goal' : '⚠ Below target pace'}
          </p>
          <p className="text-xs opacity-80">
            {percentComplete.toFixed(0)}% of ₦{cycleTarget.toLocaleString()} target
          </p>
        </div>
      )}
    </div>
  );
}
