import { useState } from 'react';
import { Eye, EyeOff, Sparkles, CalendarDays, TrendingUp } from 'lucide-react';
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
      <div className="space-y-5" aria-label="Loading earnings" role="status">
        <Skeleton className="h-4 w-32 bg-white/15" />
        <Skeleton className="h-12 w-44 bg-white/15" />
        <Skeleton className="h-2 w-full bg-white/15" />
        <Skeleton className="h-14 w-full bg-white/15" />
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
    <div className="relative z-10 text-white">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-100">
              <Sparkles className="h-3.5 w-3.5 text-teal-200" /> Your progress
            </span>
            {includesRankingBonus && <span className="rounded-full bg-teal-300/15 px-2.5 py-1 text-[11px] font-medium text-teal-100">+ ranking bonus</span>}
          </div>
          <p className="text-sm font-medium text-indigo-100/80">Total earnings</p>
          {isHidden ? (
            <div aria-label="Earnings hidden" className="mt-2 h-11 w-40 rounded-lg bg-white/15" />
          ) : (
            <p className="mt-1 break-all text-4xl font-bold tracking-tight sm:text-5xl tabular-nums">{formattedAmount}</p>
          )}
          <p className="mt-2 text-xs text-indigo-100/70">For your selected cycle · based on included sources</p>
        </div>
        <div className="relative shrink-0">
          {showTooltip && (
            <div className="absolute top-full right-0 z-10 mt-3 w-44 rounded-lg bg-white px-3 py-2 text-xs text-slate-900 shadow-lg">
              <p>{isHidden ? 'Tap the eye to reveal your earnings' : 'Tap to hide your earnings'}</p>
              <button onClick={handleDismissTooltip} className="mt-1.5 font-semibold text-indigo-700">Got it</button>
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={handleToggle} className="h-10 w-10 rounded-xl border border-white/15 bg-white/10 text-white hover:bg-white/20 hover:text-white" aria-label={isHidden ? 'Show earnings' : 'Hide earnings'} title={isHidden ? 'Show earnings' : 'Hide earnings'}>
            {isHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      <div className="mt-8 max-w-2xl space-y-2">
        <div className="flex justify-between gap-2 text-xs text-indigo-100/80"><span>Cycle progress · day {daysElapsed} of {totalDays}</span><span>{daysRemaining} days left</span></div>
        <div className="h-2 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-label="Cycle progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(Math.max(0, Math.min(progressPercent, 100)))}>
          <div className="h-full rounded-full bg-teal-300 motion-safe:transition-all" style={{ width: `${Math.max(0, Math.min(progressPercent, 100))}%` }} />
        </div>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 border-t border-white/15 pt-5 sm:max-w-md">
        <div className="flex items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10"><CalendarDays className="h-4 w-4 text-teal-200" /></span><div><p className="text-xs text-indigo-100/70">Days with earnings</p><p className="text-lg font-semibold tabular-nums">{daysActive}</p></div></div>
        <div className="flex min-w-0 items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10"><TrendingUp className="h-4 w-4 text-teal-200" /></span><div className="min-w-0"><p className="text-xs text-indigo-100/70">Daily average</p>{isHidden ? <div aria-label="Daily average hidden" className="mt-1 h-5 w-16 rounded bg-white/15" /> : <p className="break-all text-lg font-semibold tabular-nums">₦{Math.round(avgDaily).toLocaleString()}</p>}</div></div>
      </div>
    </div>
  );
}
