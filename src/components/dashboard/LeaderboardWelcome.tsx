import { useState, useEffect } from 'react';
import { Trophy, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'leaderboard-welcome-dismissed';

export function LeaderboardWelcome() {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Check if user has already seen this
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) {
      // Small delay before showing
      const showTimer = setTimeout(() => {
        setIsVisible(true);
        setIsAnimating(true);
      }, 1500);

      // Auto-dismiss after 6 seconds
      const hideTimer = setTimeout(() => {
        handleDismiss();
      }, 8000);

      return () => {
        clearTimeout(showTimer);
        clearTimeout(hideTimer);
      };
    }
  }, []);

  const handleDismiss = () => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsVisible(false);
      localStorage.setItem(STORAGE_KEY, 'true');
    }, 300);
  };

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50 max-w-sm transition-all duration-300 ease-out',
        isAnimating 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 translate-y-4'
      )}
    >
      <div className="bg-card border border-border rounded-xl shadow-lg overflow-hidden">
        <div className="relative px-4 py-3">
          {/* Gradient accent */}
          <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary via-primary/60 to-transparent" />
          
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 p-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-start gap-3 pr-6">
            <div className="flex-shrink-0 p-2 rounded-lg bg-primary/10">
              <Trophy className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="font-medium text-sm text-foreground">
                Leaderboard is here! 🎉
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Compare your performance with team members in your stage. Check the weekly and cycle rankings!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
