import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  onDisplayModeChange?: (mode: EarningsDisplayMode) => void;
  tooltipDismissed?: boolean;
  onDismissTooltip?: () => void;
  includesRankingBonus?: boolean;
}

export function CycleSummaryCard({
  cycle,
  totalEarnings,
  daysActive,
  isLoading,
  displayMode = 'dots',
  onDisplayModeChange,
  tooltipDismissed = false,
  onDismissTooltip,
  includesRankingBonus = false,
}: CycleSummaryCardProps) {
  const [showTooltip, setShowTooltip] = useState(!tooltipDismissed);
  const daysElapsed = getDaysElapsedInCycle(cycle);
  const daysRemaining = getDaysRemainingInCycle(cycle);
  const totalDays = getTotalDaysInCycle(cycle);
  const avgDaily = daysActive > 0 ? totalEarnings / daysActive : 0;
  const progressPercent = (daysElapsed / totalDays) * 100;

  if (isLoading) {
    return (
      <div role="status" aria-label="Loading earnings" className="flex flex-col items-center gap-4 py-6">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-12 w-48 sm:h-14" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-8 h-2 w-full max-w-md" />
      </div>
    );
  }

  const formattedAmount = `₦${totalEarnings.toLocaleString()}`;
  const isHidden = displayMode === 'dots';

  const handleToggle = () => {
    const newMode = displayMode === 'amount' ? 'dots' : 'amount';
    onDisplayModeChange?.(newMode);
  };

  const handleDismissTooltip = () => {
    setShowTooltip(false);
    onDismissTooltip?.();
  };

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="flex flex-col items-center text-center">
        <p className="text-sm font-medium text-muted-foreground">Total earnings</p>
        <div className="mt-3 flex max-w-full items-center justify-center gap-2">
          {isHidden ? (
            <div aria-label="Earnings hidden" className="h-12 w-44 rounded-lg bg-muted sm:h-14" />
          ) : (
            <p className="break-all text-4xl font-bold tracking-tight tabular-nums text-foreground sm:text-5xl lg:text-6xl">{formattedAmount}</p>
          )}
          <div className="relative shrink-0">
            <Button variant="ghost" size="icon" onClick={handleToggle} className="h-10 w-10 rounded-full text-muted-foreground" aria-label={isHidden ? 'Show earnings' : 'Hide earnings'} title={isHidden ? 'Show earnings' : 'Hide earnings'}>
              {isHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
            {showTooltip && (
              <div className="absolute right-0 top-full z-20 mt-2 w-44 rounded-xl bg-foreground p-3 text-left text-xs text-background shadow-lg">
                <p>{isHidden ? 'Tap the eye to reveal your earnings' : 'Tap the eye to hide your earnings'}</p>
                <button onClick={handleDismissTooltip} className="mt-2 font-semibold underline">Got it</button>
              </div>
            )}
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{cycle.label}</p>
        {includesRankingBonus && <p className="mt-2 text-xs font-medium text-primary">Includes ranking bonus</p>}
      </div>
      <div className="mt-9 space-y-2">
        <div className="flex justify-between gap-2 text-xs text-muted-foreground"><span>Day {daysElapsed} of {totalDays}</span><span>{daysRemaining} days left</span></div>
        <Progress value={progressPercent} className="h-1.5" />
      </div>
      <div className="mt-6 grid grid-cols-2 gap-4 border-t border-border/60 pt-5 text-center">
        <div><p className="text-xs text-muted-foreground">Days with earnings</p><p className="mt-1 text-lg font-semibold tabular-nums">{daysActive}</p></div>
        <div><p className="text-xs text-muted-foreground">Daily average</p>{isHidden ? <div aria-label="Daily average hidden" className="mx-auto mt-2 h-5 w-20 rounded-md bg-muted" /> : <p className="mt-1 break-all text-lg font-semibold tabular-nums">₦{Math.round(avgDaily).toLocaleString()}</p>}</div>
      </div>
    </div>
  );
}
