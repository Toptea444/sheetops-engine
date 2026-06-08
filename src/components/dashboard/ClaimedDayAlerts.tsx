import { useMemo, useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import type { DayTransfer } from '@/hooks/useEarningsAdjustments';

interface Props {
  workerId: string | null;
  /** All IDs this user owns (handles ID swaps). Defaults to [workerId]. */
  ownedWorkerIds?: string[];
  transfers: DayTransfer[];
}

const STORAGE_KEY = 'performanceTracker_dismissedClaimAlerts_v1';

function loadDismissed(): Record<string, true> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveDismissed(map: Record<string, true>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {/* ignore */}
}

function fmtDate(d: string): string {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

/**
 * Shows a dismissible alert whenever another worker has claimed a day on this
 * user's ID (i.e. a `user_addition` where this user is the *source*). Helps
 * the deducted user understand why money disappeared from their breakdown.
 */
export function ClaimedDayAlerts({ workerId, ownedWorkerIds, transfers }: Props) {
  const [dismissed, setDismissed] = useState<Record<string, true>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setDismissed(loadDismissed());
    setMounted(true);
  }, []);

  const owned = useMemo(() => {
    const set = new Set<string>();
    if (workerId) set.add(workerId.toUpperCase());
    (ownedWorkerIds || []).forEach(id => id && set.add(id.toUpperCase()));
    return set;
  }, [workerId, ownedWorkerIds]);

  const claims = useMemo(() => {
    return transfers
      .filter(t =>
        t.kind === 'user_addition' &&
        owned.has((t.source_worker_id || '').toUpperCase()) &&
        !owned.has((t.target_worker_id || '').toUpperCase())
      )
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [transfers, owned]);

  const visible = claims.filter(c => !dismissed[c.id]);

  if (!mounted || visible.length === 0) return null;

  const dismiss = (id: string) => {
    const next = { ...dismissed, [id]: true as const };
    setDismissed(next);
    saveDismissed(next);
  };

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-1.5rem)] max-w-md space-y-2 pointer-events-none">
      {visible.slice(0, 3).map(t => {
        const claimer = (t.target_worker_id || '').toUpperCase();
        return (
          <div
            key={t.id}
            className="pointer-events-auto bg-card border border-red-200 dark:border-red-900 rounded-xl shadow-lg overflow-hidden animate-in slide-in-from-top-2 fade-in duration-300"
          >
            <div className="relative px-3.5 py-3">
              <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-red-500 via-red-400/70 to-transparent" />
              <button
                onClick={() => dismiss(t.id)}
                className="absolute top-2 right-2 p-1 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                aria-label="Dismiss alert"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <div className="flex items-start gap-2.5 pr-6 pl-1">
                <div className="shrink-0 p-1.5 rounded-lg bg-red-100 dark:bg-red-950/40">
                  <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
                <div className="space-y-1 min-w-0">
                  <p className="text-[13px] font-medium text-foreground">
                    Earnings moved off your account
                  </p>
                  <p className="text-[12px] text-muted-foreground leading-relaxed">
                    <strong className="text-foreground">{claimer}</strong> claimed they worked for you on{' '}
                    <strong className="text-foreground">{fmtDate(t.transfer_date)}</strong>, so ₦{Number(t.amount).toLocaleString()} was deducted from your earnings and added to theirs.
                  </p>
                  {visible.length > 1 && (
                    <p className="text-[10.5px] text-muted-foreground/80 pt-0.5">
                      {visible.length - 1} more {visible.length - 1 === 1 ? 'alert' : 'alerts'} after this
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
