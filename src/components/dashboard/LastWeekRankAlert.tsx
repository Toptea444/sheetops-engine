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

export function LastWeekRankAlert({ weekKey, weekLabel, hasData, enabled, onOpen }: Props) {
  const [visible, setVisible] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!enabled || !weekKey) return;
    if (localStorage.getItem(STORAGE_KEY) === weekKey) return;
    const t = setTimeout(() => { setVisible(true); requestAnimationFrame(() => setShown(true)); }, 4000);
    return () => clearTimeout(t);
  }, [enabled, weekKey]);

  const close = () => {
    if (weekKey) localStorage.setItem(STORAGE_KEY, weekKey);
    setShown(false);
    setTimeout(() => setVisible(false), 300);
  };

  if (!visible) return null;
  const pending = hasData === false;

  return (
    <div className={cn('fixed bottom-4 left-4 right-4 sm:right-auto z-50 sm:max-w-xs transition-all duration-300 ease-out', shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3')}>
      <div className="relative bg-card border border-border rounded-xl shadow-lg">
        <button onClick={close} aria-label="Dismiss" className="absolute top-2 right-2 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <X className="h-4 w-4" />
        </button>
        <button
          onClick={() => { close(); if (!pending) onOpen(); }}
          className={cn('w-full flex items-start gap-3 px-4 py-3 pr-9 text-left', pending && 'cursor-default')}
        >
          <div className="shrink-0 p-2 rounded-lg bg-primary/10">
            {pending ? <Clock className="h-5 w-5 text-primary" /> : <Trophy className="h-5 w-5 text-primary" />}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">
              {pending ? "Last week's bonus isn't updated yet" : 'See where you ranked last week'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              {pending ? `${weekLabel} hasn't been added to the sheet. Keep working, check back soon.` : (
                <span className="inline-flex items-center gap-0.5">{weekLabel} · Tap to view <ChevronRight className="h-3 w-3" /></span>
              )}
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}
