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
    <div className="space-y-4 p-6 rounded-2xl card-gradient-pink text-white relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-3 right-6 text-2xl opacity-30">✨</div>
      <div className="absolute bottom-4 left-4 text-2xl opacity-25">💖</div>
      
      <div className="relative z-10">
        {/* Header with toggle */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <p className="text-sm font-bold">Total Earnings</p>
            {includesRankingBonus && (
              <span className="text-[10px] font-bold text-white bg-white/30 backdrop-blur-sm border border-white/40 px-2 py-1 rounded-full whitespace-nowrap">
                + ranking bonus
              </span>
            )}
          </div>
          <div className="relative">
            {showTooltip && (
              <div className="absolute bottom-full right-0 mb-3 z-10 animate-in fade-in slide-in-from-bottom-1 duration-200">
                <div className="bg-white text-foreground rounded-xl px-3 py-2 w-44 cute-shadow-lg">
                  <p className="text-xs leading-relaxed font-medium">
                    {displayMode === 'dots' 
                      ? '👀 Tap the eye to reveal your earnings' 
                      : '🙈 Tap to hide your earnings'}
                  </p>
                  <button
                    onClick={handleDismissTooltip}
                    className="text-xs text-primary font-bold mt-1.5 transition-colors hover:opacity-80"
                  >
                    Got it!
                  </button>
                </div>
                {/* Arrow pointing down to the eye icon */}
                <div className="flex justify-end pr-3">
                  <div className="w-2.5 h-2.5 bg-white rotate-45 -mt-[5px]" />
                </div>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggle}
              className="h-8 w-8 hover:bg-white/20 text-white"
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
        <div className="mb-4">
          {isHidden ? (
            <div className="h-12 w-40 rounded-xl bg-white/20 animate-pulse" />
          ) : (
            <p className="text-4xl font-black tracking-tight text-white drop-shadow-lg">
              {formattedAmount}
            </p>
          )}
        </div>

        {/* Progress bar */}
        <div className="space-y-2 mb-4">
          <div className="h-2.5 w-full bg-white/30 rounded-full overflow-hidden backdrop-blur-sm">
            <div 
              className="h-full bg-white/80 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-white/90 font-medium">
            <span>Day {daysElapsed}/{totalDays}</span>
            <span>{daysRemaining} days left</span>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
            <p className="text-xs text-white/80 font-medium mb-1">Days with Earnings</p>
            <p className="text-2xl font-black text-white">{daysActive}</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
            <p className="text-xs text-white/80 font-medium mb-1">Daily Avg</p>
            {isHidden ? (
              <div className="h-7 w-20 rounded-lg bg-white/10 animate-pulse" />
            ) : (
              <p className="text-lg font-black text-white">₦{Math.round(avgDaily).toLocaleString()}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
