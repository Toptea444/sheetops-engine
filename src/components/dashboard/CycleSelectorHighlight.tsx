import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, ChevronRight } from 'lucide-react';

interface CycleSelectorHighlightProps {
  isVisible: boolean;
  onDismiss: () => void;
  targetRef: React.RefObject<HTMLElement | null>;
}

const HIGHLIGHT_SEEN_KEY_PREFIX = 'performanceTracker_cycleSelectorHighlightSeen_';

/** Returns the current cycle key as YYYY-MM based on the 16th-start rule. */
function getCurrentCycleKey(): string {
  const now = new Date();
  const day = now.getDate();
  // If before the 16th, the current cycle started on the 16th of the previous month
  const year = day < 16 ? (now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()) : now.getFullYear();
  const month = day < 16 ? (now.getMonth() === 0 ? 12 : now.getMonth()) : now.getMonth() + 1;
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function hasSeenCycleSelectorHighlight(): boolean {
  try {
    return localStorage.getItem(HIGHLIGHT_SEEN_KEY_PREFIX + getCurrentCycleKey()) === 'true';
  } catch {
    return false;
  }
}

export function markCycleSelectorHighlightAsSeen(): void {
  try {
    localStorage.setItem(HIGHLIGHT_SEEN_KEY_PREFIX + getCurrentCycleKey(), 'true');
  } catch {
    // ignore
  }
}

export function CycleSelectorHighlight({
  isVisible,
  onDismiss,
  targetRef,
}: CycleSelectorHighlightProps) {
  const [position, setPosition] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  useEffect(() => {
    if (!isVisible || !targetRef.current) return;

    const updatePosition = () => {
      if (!targetRef.current) return;
      const rect = targetRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    };

    updatePosition();
    const rafId = requestAnimationFrame(updatePosition);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, { passive: true });

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [isVisible, targetRef]);



  useEffect(() => {
    if (!isVisible) return;

    window.scrollTo({ top: 0, behavior: 'smooth' });

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    const preventScroll = (event: Event) => {
      event.preventDefault();
    };

    window.addEventListener('wheel', preventScroll, { passive: false });
    window.addEventListener('touchmove', preventScroll, { passive: false });

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      window.removeEventListener('wheel', preventScroll);
      window.removeEventListener('touchmove', preventScroll);
    };
  }, [isVisible]);
  const handleDismiss = () => {
    markCycleSelectorHighlightAsSeen();
    onDismiss();
  };

  // Clone the target element's content to show above the blur
  useEffect(() => {
    if (isVisible && targetRef.current && position) {
      // Ensure the original element stays visible above the overlay
      targetRef.current.style.position = 'relative';
      targetRef.current.style.zIndex = '95';
    }
    
    return () => {
      if (targetRef.current) {
        targetRef.current.style.position = '';
        targetRef.current.style.zIndex = '';
      }
    };
  }, [isVisible, targetRef, position]);

  if (!isVisible || !position) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop overlay with blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[90] bg-background/80 backdrop-blur-sm"
            onClick={handleDismiss}
          />

          {/* Highlight ring around the cycle selector */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="fixed z-[94] pointer-events-none"
            style={{
              top: position.top - 8,
              left: position.left - 8,
              width: position.width + 16,
              height: position.height + 16,
            }}
          >
            {/* Glow ring around the element */}
            <motion.div
              className="absolute inset-0 rounded-xl border-2 border-primary"
              style={{
                boxShadow: '0 0 20px hsl(var(--primary) / 0.4)',
              }}
              animate={{
                boxShadow: [
                  '0 0 15px hsl(var(--primary) / 0.3)',
                  '0 0 30px hsl(var(--primary) / 0.5)',
                  '0 0 15px hsl(var(--primary) / 0.3)',
                ],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
            
            {/* Pulsing indicator */}
            <motion.div
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [1, 0.7, 1],
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </motion.div>

          {/* Tooltip card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="fixed z-[100]"
            style={{
              top: position.top + position.height + 20,
              left: Math.max(16, Math.min(position.left, window.innerWidth - 320)),
            }}
          >
            <div className="bg-card border border-border rounded-2xl shadow-2xl p-5 max-w-[300px]">
              {/* Close button */}
              <button
                onClick={handleDismiss}
                className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Icon and content */}
              <div className="flex items-start gap-3 pr-6">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-2">
                  <p className="font-semibold text-sm text-foreground">
                    View Previous Cycles
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Tap here to switch between cycles and view your past performance history.
                  </p>
                </div>
              </div>

              {/* Action button */}
              <button
                onClick={handleDismiss}
                className="w-full mt-4 py-2.5 bg-primary/10 hover:bg-primary/15 rounded-xl text-sm font-medium text-primary transition-colors flex items-center justify-center gap-1.5"
              >
                Got it
                <ChevronRight className="h-4 w-4" />
              </button>

              {/* Arrow pointing up to the selector */}
              <div 
                className="absolute -top-2 w-4 h-4 bg-card border-l border-t border-border rotate-45"
                style={{ left: Math.min(40, position.left - 8) }}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
