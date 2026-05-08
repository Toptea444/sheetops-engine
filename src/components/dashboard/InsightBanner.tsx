import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Activity, X, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Insight } from '@/hooks/useEarningsInsight';

const TONE_ICON: Record<string, LucideIcon> = {
  positive: TrendingUp,
  concern: TrendingDown,
  neutral: Activity,
};

interface InsightBannerProps {
  insight: Insight | null;
  loading?: boolean;
  /** Used to force-reset dismissed state when underlying data changes */
  signature?: string;
}

const DISMISS_KEY = 'earnings_insight_dismissed_v1';

function readDismissed(): string | null {
  try {
    return localStorage.getItem(DISMISS_KEY);
  } catch {
    return null;
  }
}

export function InsightBanner({ insight, loading, signature }: InsightBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!insight || !signature) return;
    const stored = readDismissed();
    if (stored === signature) {
      setDismissed(true);
    } else {
      setDismissed(false);
      const t = setTimeout(() => setMounted(true), 60);
      return () => clearTimeout(t);
    }
  }, [insight, signature]);

  if (loading || !insight || dismissed) return null;

  const tone = insight.tone;
  const toneStyles =
    tone === 'positive'
      ? 'border-primary/30 bg-primary/5 text-foreground'
      : tone === 'concern'
      ? 'border-destructive/30 bg-destructive/5 text-foreground'
      : 'border-border bg-card text-foreground';

  const iconTone =
    tone === 'positive' ? 'text-primary' : tone === 'concern' ? 'text-destructive' : 'text-muted-foreground';

  const handleDismiss = () => {
    setDismissed(true);
    try {
      if (signature) localStorage.setItem(DISMISS_KEY, signature);
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      className={cn(
        'transition-all duration-300 ease-out',
        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'
      )}
    >
      <div
        className={cn(
          'relative flex items-start gap-2.5 rounded-xl border px-3 py-2.5 pr-8 shadow-sm',
          toneStyles
        )}
        role="status"
      >
        {(() => {
          const Icon = TONE_ICON[tone] || Activity;
          return <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', iconTone)} />;
        })()}
        <p className="text-xs sm:text-sm leading-snug flex-1">{insight.insight}</p>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss insight"
          className="absolute top-1.5 right-1.5 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
