import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import type { CyclePeriod } from '@/lib/cycleUtils';
import { getDaysElapsedInCycle, getDaysRemainingInCycle, getTotalDaysInCycle } from '@/lib/cycleUtils';

interface CycleSummaryCardProps {
  cycle: CyclePeriod;
  totalEarnings: number;
  daysActive: number;
  isLoading?: boolean;
}

export function CycleSummaryCard({
  cycle,
  totalEarnings,
  daysActive,
  isLoading,
}: CycleSummaryCardProps) {
  const daysElapsed = getDaysElapsedInCycle(cycle);
  const daysRemaining = getDaysRemainingInCycle(cycle);
  const totalDays = getTotalDaysInCycle(cycle);
  const avgDaily = daysActive > 0 ? totalEarnings / daysActive : 0;
  const progressPercent = (daysElapsed / totalDays) * 100;

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-2 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main earnings */}
      <div>
        <p className="text-xs text-muted-foreground mb-0.5">Total Earnings</p>
        <p className="text-3xl font-bold tracking-tight">
          ₦{totalEarnings.toLocaleString()}
        </p>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <Progress value={progressPercent} className="h-1.5" />
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>Day {daysElapsed}/{totalDays}</span>
          <span>{daysRemaining} days left</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex gap-6 pt-1">
        <div>
          <p className="text-[11px] text-muted-foreground">Active Days</p>
          <p className="text-lg font-semibold">{daysActive}</p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">Daily Avg</p>
          <p className="text-lg font-semibold">₦{Math.round(avgDaily).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
