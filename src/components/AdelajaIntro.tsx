import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

const STORAGE_KEY = 'adelaja_intro_last_shown';
const TOTAL_DURATION_MS = 2000;

interface AdelajaIntroProps {
  onComplete: () => void;
}

function shouldShow(): boolean {
  try {
    const last = localStorage.getItem(STORAGE_KEY);
    return last !== new Date().toDateString();
  } catch {
    return true;
  }
}

function markShown() {
  try {
    localStorage.setItem(STORAGE_KEY, new Date().toDateString());
  } catch {
    /* ignore */
  }
}

export function AdelajaIntro({ onComplete }: AdelajaIntroProps) {
  const [visible, setVisible] = useState<boolean>(() => shouldShow());
  const reduceMotion = useReducedMotion();

  const finish = useCallback(() => {
    setVisible(false);
  }, []);

  useEffect(() => {
    if (!visible) {
      onComplete();
      return;
    }
    markShown();
    const t = setTimeout(finish, TOTAL_DURATION_MS);
    return () => clearTimeout(t);
  }, [visible, finish, onComplete]);

  // Letters for staggered reveal
  const text = 'Built by Adelaja';
  const letters = text.split('');

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {visible && (
        <motion.div
          key="adelaja-intro"
          role="status"
          aria-label="Built by Adelaja"
          onClick={finish}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-background cursor-pointer select-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.985 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        >
          {/* Subtle radial glow */}
          <motion.div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at 50% 50%, hsl(var(--primary) / 0.10), transparent 60%)',
            }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />

          <div className="relative flex flex-col items-center gap-3 px-6">
            {/* Text */}
            <div className="flex items-baseline overflow-hidden">
              {reduceMotion ? (
                <motion.span
                  className="text-2xl sm:text-3xl font-light tracking-[0.2em] text-foreground/90 uppercase"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {text}
                </motion.span>
              ) : (
                letters.map((ch, i) => (
                  <motion.span
                    key={i}
                    className="text-2xl sm:text-3xl font-light tracking-[0.2em] text-foreground/90 uppercase inline-block"
                    initial={{ y: '110%', opacity: 0 }}
                    animate={{ y: '0%', opacity: 1 }}
                    transition={{
                      duration: 0.55,
                      delay: 0.25 + i * 0.035,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  >
                    {ch === ' ' ? '\u00A0' : ch}
                  </motion.span>
                ))
              )}
            </div>

            {/* Accent line */}
            <motion.div
              className="h-px bg-primary/70 origin-left"
              initial={{ scaleX: 0, width: '8rem' }}
              animate={{ scaleX: 1 }}
              transition={{
                duration: 0.7,
                delay: reduceMotion ? 0.2 : 0.85,
                ease: [0.65, 0, 0.35, 1],
              }}
              style={{ width: '8rem' }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
