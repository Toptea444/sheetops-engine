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
      <div role="status" aria-label="Loading earnings" className="space-y-5 py-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-12 w-48" />
        <Skeleton className="h-3 w-36" />
        <Skeleton className="h-12 w-full" />
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
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-muted-foreground">Total earnings</p>
          {includesRankingBonus && <span className="rounded-full bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary">Includes ranking bonus</span>}
        </div>
        <div className="relative shrink-0">
          {showTooltip && (
            <div className="absolute right-0 top-full z-20 mt-2 w-44 rounded-xl bg-foreground p-3 text-xs text-background shadow-lg">
              <p>{isHidden ? 'Tap the eye to reveal your earnings' : 'Tap the eye to hide your earnings'}</p>
              <button onClick={handleDismissTooltip} className="mt-2 font-semibold underline">Got it</button>
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={handleToggle} aria-label={isHidden ? 'Show earnings' : 'Hide earnings'} title={isHidden ? 'Show earnings' : 'Hide earnings'} className="h-10 w-10 rounded-full text-muted-foreground">
            {isHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      <div className="mt-4 min-w-0">
        {isHidden ? <div aria-label="Earnings hidden" className="h-12 w-48 rounded-lg bg-muted" /> : <p className="break-all text-4xl font-semibold tracking-tight tabular-nums text-foreground sm:text-5xl">{formattedAmount}</p>}
        <p className="mt-2 text-xs text-muted-foreground">{cycle.label}</p>
      </div>
      <div className="mt-8 space-y-2">
        <div className="flex justify-between gap-2 text-xs text-muted-foreground"><span>Cycle progress · day {daysElapsed} of {totalDays}</span><span>{daysRemaining} days left</span></div>
        <div role="progressbar" aria-label="Cycle progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(Math.max(0, Math.min(progressPercent, 100)))} className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(progressPercent, 100))}%` }} />
        </div>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-4 border-t border-border/70 pt-5">
        <div><p className="text-xs text-muted-foreground">Days with earnings</p><p className="mt-1 text-lg font-semibold tabular-nums">{daysActive}</p></div>
        <div><p className="text-xs text-muted-foreground">Daily average</p>{isHidden ? <div aria-label="Daily average hidden" className="mt-2 h-5 w-20 rounded bg-muted" /> : <p className="mt-1 break-all text-lg font-semibold tabular-nums">₦{Math.round(avgDaily).toLocaleString()}</p>}</div>
      </div>
    </div>
  );
}
