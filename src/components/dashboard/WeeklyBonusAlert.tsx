import { useState, useEffect } from 'react';
import { Info, X, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'weekly-bonus-alert-dismissed';
const GROUP_LINK = 'https://chat.whatsapp.com/your-group-link'; // Placeholder - user should update

export function WeeklyBonusAlert() {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Check if user has already dismissed this session
    const dismissed = sessionStorage.getItem(STORAGE_KEY);
    if (!dismissed) {
      // Small delay before showing
      const showTimer = setTimeout(() => {
        setIsVisible(true);
        setIsAnimating(true);
      }, 2000);

      // Auto-dismiss after 10 seconds
      const hideTimer = setTimeout(() => {
        handleDismiss();
      }, 12000);

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
      sessionStorage.setItem(STORAGE_KEY, 'true');
    }, 300);
  };

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        'fixed bottom-4 left-4 z-50 max-w-xs transition-all duration-300 ease-out',
        isAnimating 
          ? 'opacity-100 translate-x-0' 
          : 'opacity-0 -translate-x-4'
      )}
    >
      <div className="bg-card border border-border rounded-xl shadow-lg overflow-hidden">
        <div className="relative px-4 py-3">
          {/* Gradient accent */}
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
                Weekly Bonus Not Tracked
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                This app doesn't track the weekly bonus sheet. Use the link from the group to check your weekly bonus.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
