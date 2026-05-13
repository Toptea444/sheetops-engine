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
    <div className="space-y-5">
      {/* Bold header with gradient background */}
      <div className="cotton-candy-accent rounded-2xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap min-w-0">
          <p className="text-sm font-bold">💰 Total Earnings</p>
          {includesRankingBonus && (
            <span className="text-[10px] font-bold text-white bg-black/20 px-2 py-1 rounded-full whitespace-nowrap">
              + Ranking Bonus ⭐
            </span>
          )}
        </div>
        <div className="relative">
          {showTooltip && (
            <div className="absolute bottom-full right-0 mb-3 z-10 animate-in fade-in slide-in-from-bottom-1 duration-200">
              <div className="bg-black/90 text-white rounded-2xl px-4 py-3 w-48 shadow-lg">
                <p className="text-xs leading-relaxed font-medium">
                  {displayMode === 'dots' 
                    ? '👀 Tap the eye to reveal your earnings' 
                    : '🙈 Tap to hide your earnings'}
                </p>
                <button
                  onClick={handleDismissTooltip}
                  className="text-xs text-white/80 hover:text-white font-bold mt-2 transition-colors"
                >
                  Got it! ✓
                </button>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggle}
            className="h-9 w-9 hover:bg-white/20 rounded-full"
            title={displayMode === 'dots' ? 'Show amount' : 'Show dots'}
          >
            {displayMode === 'dots' ? (
              <Eye className="h-5 w-5 text-white" />
            ) : (
              <EyeOff className="h-5 w-5 text-white" />
            )}
          </Button>
        </div>
      </div>

      {/* Main earnings display - Big and bold */}
      <div className="bubble-card p-5">
        {isHidden ? (
          <div className="h-12 w-48 rounded-2xl bg-gradient-to-r from-primary/30 to-accent/30 animate-pulse" />
        ) : (
          <p className="text-4xl font-black tracking-tight bg-gradient-to-r from-primary to-pink-500 bg-clip-text text-transparent">
            {formattedAmount}
          </p>
        )}
      </div>

      {/* Progress bar with colorful styling */}
      <div className="space-y-3">
        <div className="relative h-3 rounded-full bg-gradient-to-r from-primary/20 via-accent/20 to-success/20 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-primary via-accent to-success rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-xs font-bold text-foreground">
          <span>📅 Day {daysElapsed}/{totalDays}</span>
          <span>⏰ {daysRemaining} days left</span>
        </div>
      </div>

      {/* Stats row - Colorful cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="sky-accent rounded-2xl px-4 py-3">
          <p className="text-xs font-bold text-white/90 mb-1">💪 Active Days</p>
          <p className="text-2xl font-black text-white">{daysActive}</p>
        </div>
        <div className="mint-accent rounded-2xl px-4 py-3">
          <p className="text-xs font-bold text-white/90 mb-1">📊 Daily Avg</p>
          {isHidden ? (
            <div className="h-7 w-24 rounded-lg bg-white/20 animate-pulse" />
          ) : (
            <p className="text-xl font-black text-white">₦{Math.round(avgDaily).toLocaleString()}</p>
          )}
        </div>
      </div>
    </div>
  );
}
