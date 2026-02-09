import { useState, useEffect } from 'react';
import { Info, X, FileSpreadsheet } from 'lucide-react';
import { cn } from '@/lib/utils';

export function RankingBonusAlert() {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const showTimer = setTimeout(() => {
      setIsVisible(true);
      setIsAnimating(true);
    }, 3500);

    const hideTimer = setTimeout(() => {
      handleDismiss();
    }, 15000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  const handleDismiss = () => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsVisible(false);
    }, 300);
  };

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        'fixed bottom-28 left-4 z-50 max-w-xs transition-all duration-300 ease-out',
        isAnimating
          ? 'opacity-100 translate-x-0'
          : 'opacity-0 -translate-x-4'
      )}
    >
      <div className="bg-card border border-border rounded-xl shadow-lg overflow-hidden">
        <div className="relative px-4 py-3">
          <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-primary via-primary/60 to-transparent" />

          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 p-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-start gap-3 pr-6 pl-1">
            <div className="flex-shrink-0 p-2 rounded-lg bg-primary/10">
              <Info className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-2">
              <p className="font-medium text-sm text-foreground">
                Ranking Bonus Paid
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                The Ranking Bonus GH amount is hidden since it has been paid. To view it, tap the{' '}
                <FileSpreadsheet className="inline h-3.5 w-3.5 -mt-0.5" /> sheet icon and select it.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
