import { useEffect, useState } from 'react';
import { Trophy, Clock, X, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  weekKey: string | null;
  weekLabel: string;
  hasData: boolean | null; // null = unknown
  enabled: boolean;
  onOpen: () => void;
}

const STORAGE_KEY = 'performanceTracker_lastWeekRankAlertSeen';
const REVEAL_DELAY = 4000; // wait a beat after load
const AUTO_CLOSE_AFTER = 5000; // then fade away on its own

export function LastWeekRankAlert({ weekKey, weekLabel, hasData, enabled, onOpen }: Props) {
  const [visible, setVisible] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!enabled || !weekKey) return;
    if (localStorage.getItem(STORAGE_KEY) === weekKey) return;
    setVisible(false);
    setShown(false);
    const t = setTimeout(() => {
      setVisible(true);
      requestAnimationFrame(() => setShown(true));
    }, REVEAL_DELAY);
    return () => clearTimeout(t);
  }, [enabled, weekKey]);

  const close = () => {
    if (weekKey) localStorage.setItem(STORAGE_KEY, weekKey);
    setShown(false);
    setTimeout(() => setVisible(false), 300);
  };

  // Auto-dismiss shortly after it appears.
  useEffect(() => {
    if (!shown) return;
    const t = setTimeout(() => close(), AUTO_CLOSE_AFTER);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown, weekKey]);

  if (!visible) return null;
  const pending = hasData === false;

  return (
    <div className="fixed top-[68px] inset-x-0 z-[60] flex justify-center px-3 pointer-events-none">
      <div
        className={cn(
          'pointer-events-auto relative w-full max-w-sm bg-card/95 backdrop-blur-sm border border-border rounded-xl shadow-xl',
          'transition-all duration-300 ease-out',
          shown ? 'opacity-100 -translate-y-1' : 'opacity-0 -translate-y-3'
        )}
      >
        <button
          onClick={close}
          aria-label="Dismiss"
          className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-muted-foreground/70 hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => { close(); if (!pending) onOpen(); }}
          className={cn('w-full flex items-center gap-2.5 pl-3 pr-8 py-2.5 text-left', pending && 'cursor-default')}
        >
          <div className="shrink-0">
            {pending
              ? <Clock className="h-4 w-4 text-primary" />
              : <Trophy className="h-4 w-4 text-primary" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium text-foreground leading-tight truncate">
              {pending ? "Last week's bonus isn't updated yet" : 'See where you ranked last week'}
            </p>
            <p className="text-[11px] text-muted-foreground leading-tight truncate mt-0.5">
              {pending ? "Not added to the sheet yet. Check back soon." : weekLabel}
            </p>
          </div>
          {!pending && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/70" />}
        </button>
      </div>
    </div>
  );
}
