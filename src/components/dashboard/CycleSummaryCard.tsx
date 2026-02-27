import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import type { CyclePeriod } from '@/lib/cycleUtils';
import { getDaysElapsedInCycle, getDaysRemainingInCycle, getTotalDaysInCycle } from '@/lib/cycleUtils';
import type { EarningsDisplayMode } from '@/hooks/useDisplayMode';

interface CycleSummaryCardProps {
  cycle: CyclePeriod;
  totalEarnings: number;
  daysActive: number;
  isLoading?: boolean;
  displayMode?: EarningsDisplayMode;
}

export function CycleSummaryCard({
  cycle,
  totalEarnings,
  daysActive,
  isLoading,
  displayMode = 'amount',
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

  // Calculate dot scale: represent earnings in proportional dots (max 10 dots for visual balance)
  const getDotsCount = (amount: number) => {
    if (amount === 0) return 0;
    // Scale earnings to 1-10 dots range, adjust scaling if needed for your use case
    const dotsCount = Math.min(Math.ceil((amount / 100000) * 10), 12);
    return Math.max(1, dotsCount);
  };

  const dotsCount = getDotsCount(totalEarnings);
  const dotSize = 'w-3 h-3'; // Balanced size that aligns with the design

  return (
    <div className="space-y-4">
      {/* Main earnings */}
      <div>
        <p className="text-sm text-muted-foreground mb-3">Total Earnings</p>
        {displayMode === 'dots' ? (
          <div className="flex items-center gap-1.5 flex-wrap">
            {Array.from({ length: dotsCount }).map((_, index) => (
              <div
                key={index}
                className={`${dotSize} rounded-full bg-primary transition-all duration-200`}
              />
            ))}
          </div>
        ) : (
          <p className="text-3xl font-bold tracking-tight">
            ₦{totalEarnings.toLocaleString()}
          </p>
        )}
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <Progress value={progressPercent} className="h-1.5" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Day {daysElapsed}/{totalDays}</span>
          <span>{daysRemaining} days left</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex gap-8 pt-1">
        <div>
          <p className="text-xs text-muted-foreground">Active Days</p>
          <p className="text-lg font-semibold">{daysActive}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Daily Avg</p>
          <p className="text-lg font-semibold">₦{Math.round(avgDaily).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
