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
    <div className="space-y-4">
      {/* Header with toggle */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <p className="text-sm font-bold text-foreground">Total Earnings</p>
          {includesRankingBonus && (
            <span className="text-[11px] font-bold text-foreground bg-primary/20 px-2 py-0.5 rounded-full whitespace-nowrap">
              + ranking bonus
            </span>
          )}
        </div>
        <div className="relative">
          {showTooltip && (
            <div className="absolute bottom-full right-0 mb-3 z-10 animate-in fade-in slide-in-from-bottom-1 duration-200">
              <div className="bg-foreground text-background rounded-2xl px-3 py-2 w-44 soft-shadow">
                <p className="text-xs leading-relaxed font-medium">
                  {displayMode === 'dots' 
                    ? 'Tap the eye to reveal your earnings' 
                    : 'Tap to hide your earnings'}
                </p>
                <button
                  onClick={handleDismissTooltip}
                  className="text-xs text-background/70 hover:text-background font-bold mt-1.5 transition-colors"
                >
                  Got it
                </button>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggle}
            className="h-8 w-8"
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

      {/* Main earnings display - SOFT PASTEL PINK */}
      <div className="pastel-pink rounded-3xl p-6 soft-shadow">
        {isHidden ? (
          <div className="h-9 w-40 rounded-2xl bg-black/10 animate-pulse" />
        ) : (
          <p className="text-4xl font-black tracking-tight text-foreground">
            {formattedAmount}
          </p>
        )}
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div 
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-xs font-bold text-foreground">
          <span>Day {daysElapsed}/{totalDays}</span>
          <span>{daysRemaining} days left</span>
        </div>
      </div>

      {/* Stats row - SOFT PASTEL COLORS */}
      <div className="grid grid-cols-2 gap-3">
        <div className="pastel-blue rounded-3xl px-4 py-3 soft-shadow">
          <p className="text-xs font-bold text-foreground/80 mb-1">Days with Earnings</p>
          <p className="text-2xl font-black text-foreground">{daysActive}</p>
        </div>
        <div className="pastel-mint rounded-3xl px-4 py-3 soft-shadow">
          <p className="text-xs font-bold text-foreground/80 mb-1">Daily Avg</p>
          {isHidden ? (
            <div className="h-6 w-20 rounded-lg bg-black/10 animate-pulse" />
          ) : (
            <p className="text-lg font-black text-foreground">₦{Math.round(avgDaily).toLocaleString()}</p>
          )}
        </div>
      </div>
    </div>
  );
}
