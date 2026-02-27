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
  const dotsCount = formattedAmount.length;
  const dotSize = 'w-2.5 h-2.5';

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
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Total Earnings</p>
        <div className="relative">
          {showTooltip && (
            <div className="absolute bottom-full right-1/2 translate-x-1/2 mb-3 z-10 animate-in fade-in slide-in-from-bottom-1 duration-200">
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
              <div className="flex justify-center">
                <div className="w-2.5 h-2.5 bg-foreground rotate-45 -mt-[5px]" />
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

      {/* Main earnings display */}
      <div>
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
