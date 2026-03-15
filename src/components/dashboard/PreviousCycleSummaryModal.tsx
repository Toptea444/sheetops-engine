import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { formatNaira } from '@/utils/currencyUtils';
import type { PreviousCycleSummary } from '@/lib/cycleSummaryUtils';

interface PreviousCycleSummaryModalProps {
  open: boolean;
  animated: boolean;
  summary: PreviousCycleSummary;
  onClose: () => void;
}

function formatDateLabel(date: Date) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
  }).format(date);
}

function AnimatedValue({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const duration = 700;
    const start = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <>{formatNaira(display, 0)}</>;
}

export function PreviousCycleSummaryModal({ open, animated, summary, onClose }: PreviousCycleSummaryModalProps) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (open) setStep(0);
  }, [open, animated]);

  const steps = useMemo(() => {
    return [
      {
        title: "Your last cycle is ready 🎉",
        body: (
          <div className="space-y-4 text-center">
            <p className="text-muted-foreground text-base sm:text-lg">
              Here&apos;s your recap for {summary.cycle.label}. Let&apos;s walk through how things went.
            </p>
            <div className="mx-auto h-16 w-16 rounded-full bg-primary/15 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
          </div>
        ),
      },
      {
        title: 'Your Total bonus this cycle',
        body: (
          <div className="space-y-6 text-center">
            <p className="text-4xl sm:text-6xl font-bold text-primary">
              {animated ? <AnimatedValue value={summary.totalBonus} /> : formatNaira(summary.totalBonus, 0)}
            </p>
            <div className="grid grid-cols-2 gap-4 max-w-xl mx-auto">
              <div className="rounded-xl border bg-card p-4">
                <p className="text-2xl font-semibold">{summary.bonusDays}</p>
                <p className="text-sm text-muted-foreground">Days you earned bonus</p>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <p className="text-2xl font-semibold">{summary.noBonusDays}</p>
                <p className="text-sm text-muted-foreground">Days nothing came in</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">This total combines your Daily and Performance bonus sheets as one bonus total.</p>
          </div>
        ),
      },
      {
        title: 'Your best and toughest days',
        body: (
          <div className="grid md:grid-cols-2 gap-5 text-left max-w-4xl mx-auto">
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <p className="font-semibold">Best days</p>
              {summary.bestDays.length > 0 ? summary.bestDays.map((day) => (
                <p key={day.date.getTime()} className="text-sm text-muted-foreground">
                  {formatDateLabel(day.date)} — <span className="font-semibold text-foreground">{formatNaira(day.bonus, 0)}</span>
                </p>
              )) : <p className="text-sm text-muted-foreground">No bonus days in this cycle yet.</p>}
            </div>
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <p className="font-semibold">Lowest bonus days</p>
              {summary.worstDays.length > 0 ? summary.worstDays.map((day) => (
                <p key={day.date.getTime()} className="text-sm text-muted-foreground">
                  {formatDateLabel(day.date)} — <span className="font-semibold text-foreground">{formatNaira(day.bonus, 0)}</span>
                </p>
              )) : <p className="text-sm text-muted-foreground">No bonus days in this cycle yet.</p>}
            </div>
          </div>
        ),
      },
      {
        title: "Here’s how you performed during Ranking Bonus Period",
        body: (
          <div className="space-y-5 max-w-4xl mx-auto">
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="rounded-xl border bg-card p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Ranking bonus total</p>
                <p className="text-xl font-semibold mt-1">
                  {animated ? <AnimatedValue value={summary.totalRankingBonus} /> : formatNaira(summary.totalRankingBonus, 0)}
                </p>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Ranking days</p>
                <p className="text-xl font-semibold mt-1">{summary.rankingActiveDays}</p>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Avg per ranking day</p>
                <p className="text-xl font-semibold mt-1">{formatNaira(summary.rankingAveragePerActiveDay, 0)}</p>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-4">
              {summary.rankingBestDay ? (
                <p className="text-sm text-muted-foreground">
                  Your strongest ranking day was <span className="font-semibold text-foreground">{formatDateLabel(summary.rankingBestDay.date)}</span>, where you earned{' '}
                  <span className="font-semibold text-foreground">{formatNaira(summary.rankingBestDay.rankingBonus, 0)}</span>.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">No ranking bonus activity was recorded in this cycle.</p>
              )}
            </div>

            <div className="rounded-xl border bg-primary/5 p-4">
              <p className="text-sm text-muted-foreground">
                You can view this summary anytime from the <span className="font-semibold text-foreground">View last cycle summary</span> button on your dashboard.
              </p>
            </div>
          </div>
        ),
      },
    ];
  }, [animated, summary]);

  const canPrev = step > 0;
  const canNext = step < steps.length - 1;

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="w-screen h-screen max-w-none rounded-none border-0 p-0 gap-0">
        <DialogTitle className="sr-only">Previous cycle summary</DialogTitle>
        <div className="h-full bg-background flex flex-col">
          <div className="border-b px-4 py-3 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Last cycle summary</p>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close summary">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-8 sm:px-10 sm:py-10">
            {animated ? (
              <div className="max-w-5xl mx-auto space-y-8">
                <div className="text-center space-y-2">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Step {step + 1} of {steps.length}</p>
                  <h2 className="text-2xl sm:text-4xl font-bold">{steps[step].title}</h2>
                </div>
                {steps[step].body}
              </div>
            ) : (
              <div className="max-w-5xl mx-auto space-y-8">
                <div className="text-center">
                  <h2 className="text-2xl sm:text-4xl font-bold">Here&apos;s your last cycle at a glance</h2>
                  <p className="mt-2 text-muted-foreground">{summary.cycle.label}</p>
                </div>

                <div className="rounded-2xl border bg-card p-5 text-center">
                  <p className="text-sm text-muted-foreground">Total bonus</p>
                  <p className="mt-2 text-3xl sm:text-5xl font-bold text-primary">{formatNaira(summary.totalBonus, 0)}</p>
                  <p className="mt-3 text-sm text-muted-foreground">{summary.bonusDays} days with bonus • {summary.noBonusDays} days with no bonus</p>
                </div>

                <div className="rounded-2xl border bg-card p-5">
                  <p className="font-semibold mb-3">Here’s how you performed during Ranking Bonus Period</p>
                  <p className="text-muted-foreground text-sm">
                    You earned {formatNaira(summary.totalRankingBonus, 0)} across {summary.rankingActiveDays} ranking days.
                    {summary.rankingBestDay ? ` Your strongest ranking day was ${formatDateLabel(summary.rankingBestDay.date)} (${formatNaira(summary.rankingBestDay.rankingBonus, 0)}).` : ''}
                  </p>
                </div>

                <div className="rounded-2xl border bg-card p-5">
                  <p className="font-semibold mb-3">All days in the cycle</p>
                  <div className="max-h-[40vh] overflow-y-auto space-y-2 pr-1">
                    {summary.allDays.map((day) => (
                      <div key={day.date.getTime()} className="flex items-center justify-between text-sm border-b pb-2">
                        <span>{formatDateLabel(day.date)}</span>
                        <span className="font-medium">Bonus: {formatNaira(day.bonus, 0)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {animated && (
            <div className="border-t px-4 py-3 flex items-center justify-between">
              <Button variant="outline" onClick={() => setStep((prev) => Math.max(0, prev - 1))} disabled={!canPrev}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              {canNext ? (
                <Button onClick={() => setStep((prev) => Math.min(steps.length - 1, prev + 1))}>
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button onClick={onClose}>Done</Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
