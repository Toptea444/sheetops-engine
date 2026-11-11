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
      <div className="space-y-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-2 w-full" />
      </div>
    );
  }

  // Dot count matches the number of characters in the formatted amount (e.g. "3,900" → 5 dots)
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
    <div className="flex h-full flex-col">
      {/* Header with toggle */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <p className="text-xs font-medium text-muted-foreground">Total earnings</p>
          {includesRankingBonus && (
            <span className="text-[11px] font-medium text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded-md whitespace-nowrap">
              + ranking bonus
            </span>
          )}
        </div>
        <div className="relative">
          {showTooltip && (
            <div className="absolute bottom-full right-0 mb-3 z-10 animate-in fade-in slide-in-from-bottom-1 duration-200">
              <div className="bg-foreground text-background rounded-lg px-3 py-2 w-44 shadow-md">
                <p className="text-xs leading-relaxed">
                  {displayMode === 'dots' 
                    ? 'Tap the eye to reveal your earnings' 
                    : 'Tap to hide your earnings'}
                </p>
                <button
                  onClick={handleDismissTooltip}
                  className="text-xs text-background/70 hover:text-background font-medium mt-1.5 transition-colors"
                >
                  Got it
                </button>
              </div>
              {/* Arrow pointing down to the eye icon */}
              <div className="flex justify-end pr-3">
                <div className="w-2.5 h-2.5 bg-foreground rotate-45 -mt-[5px]" />
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggle}
            className="h-9 w-9 text-muted-foreground"
            aria-label={displayMode === 'dots' ? 'Show earnings' : 'Hide earnings'}
            title={displayMode === 'dots' ? 'Show amount' : 'Show dots'}
          >
            {displayMode === 'dots' ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Main earnings display */}
      <div className="mt-3">
        {isHidden ? (
          <div className="h-11 w-40 rounded-md bg-muted" aria-label="Earnings hidden" />
        ) : (
          <p className="break-all text-4xl font-semibold tracking-tight text-foreground tabular-nums sm:text-5xl">
            {formattedAmount}
          </p>
        )}
      </div>

      {/* Progress bar */}
      <div className="mt-8 space-y-2">
        <Progress value={progressPercent} className="h-1.5" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Day {daysElapsed}/{totalDays}</span>
          <span>{daysRemaining} days left</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="mt-7 grid grid-cols-2 gap-4 border-t border-border/70 pt-5">
        <div>
          <p className="text-xs text-muted-foreground">Days with earnings</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">{daysActive}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Daily average</p>
          {isHidden ? (
            <div className="mt-1 h-6 w-20 rounded-md bg-muted" />
          ) : (
            <p className="mt-1 text-lg font-semibold tabular-nums">₦{Math.round(avgDaily).toLocaleString()}</p>
          )}
        </div>
      </div>
    </div>
  );
}
