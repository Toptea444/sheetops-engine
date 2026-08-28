import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
        <Skeleton className="h-5 w-24 bg-brand-foreground/10" />
        <Skeleton className="h-10 w-40 bg-brand-foreground/10" />
        <Skeleton className="h-2 w-full bg-brand-foreground/10" />
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
    <div className="space-y-5">
      {/* Header with toggle */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <p className="font-display text-xs font-semibold uppercase tracking-wider text-brand-foreground/60">
            Total Earnings
          </p>
          {includesRankingBonus && (
            <span className="text-[11px] font-medium text-brand-foreground bg-brand-foreground/10 border border-brand-foreground/20 px-1.5 py-0.5 rounded-md whitespace-nowrap">
              + ranking bonus
            </span>
          )}
        </div>
        <div className="relative">
          {showTooltip && (
            <div className="absolute bottom-full right-0 mb-3 z-10 animate-in fade-in slide-in-from-bottom-1 duration-200">
              <div className="bg-card text-card-foreground rounded-lg px-3 py-2 w-44 shadow-md">
                <p className="text-xs leading-relaxed">
                  {displayMode === 'dots' 
                    ? 'Tap the eye to reveal your earnings' 
                    : 'Tap to hide your earnings'}
                </p>
                <button
                  onClick={handleDismissTooltip}
                  className="text-xs text-muted-foreground hover:text-foreground font-medium mt-1.5 transition-colors"
                >
                  Got it
                </button>
              </div>
              {/* Arrow pointing down to the eye icon */}
              <div className="flex justify-end pr-3">
                <div className="w-2.5 h-2.5 bg-card rotate-45 -mt-[5px]" />
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggle}
            className="h-9 w-9 rounded-xl text-brand-foreground/80 hover:text-brand-foreground hover:bg-brand-foreground/10"
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
      <div>
        {isHidden ? (
          <div className="h-12 w-44 rounded-lg bg-brand-foreground/10 animate-pulse" />
        ) : (
          <p className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-brand-foreground tabular-nums">
            {formattedAmount}
          </p>
        )}
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="h-2 w-full rounded-full bg-brand-foreground/15 overflow-hidden">
          <div
            className="h-full rounded-full bg-brand-accent transition-all duration-700"
            style={{ width: `${Math.min(Math.max(progressPercent, 2), 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs font-medium text-brand-foreground/60">
          <span>Day {daysElapsed}/{totalDays}</span>
          <span>{daysRemaining} days left</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <div className="rounded-xl border border-brand-foreground/10 bg-brand-foreground/5 px-4 py-3">
          <p className="text-xs font-medium text-brand-foreground/60">Days with Earnings</p>
          <p className="font-display text-xl font-bold text-brand-foreground tabular-nums">{daysActive}</p>
        </div>
        <div className="rounded-xl border border-brand-foreground/10 bg-brand-foreground/5 px-4 py-3">
          <p className="text-xs font-medium text-brand-foreground/60">Daily Avg</p>
          {isHidden ? (
            <div className="h-7 w-20 rounded-md bg-brand-foreground/10 animate-pulse mt-0.5" />
          ) : (
            <p className="font-display text-xl font-bold text-brand-foreground tabular-nums">₦{Math.round(avgDaily).toLocaleString()}</p>
          )}
        </div>
      </div>
    </div>
  );
}
