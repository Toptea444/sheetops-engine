import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, PartyPopper, CalendarDays } from 'lucide-react';

const ROLLOUT_DATE = new Date('2026-05-21T00:00:00');
const GAME_DATE = new Date('2026-05-27T00:00:00');
const MODAL_SEEN_KEY = 'performanceTracker_childrenDayThemeNoticeSeen_v1';

function formatCountdownParts(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds };
}

export function ChildrensDayThemeModal({ enabled }: { enabled: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isFabExpanded, setIsFabExpanded] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!enabled) return;

    const hasSeen = localStorage.getItem(MODAL_SEEN_KEY) === 'true';
    if (!hasSeen) setIsOpen(true);
  }, [enabled]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const msToRollout = ROLLOUT_DATE.getTime() - now;
  const countdown = useMemo(() => formatCountdownParts(msToRollout), [msToRollout]);
  const launchPassed = msToRollout <= 0;

  const dismiss = () => {
    setIsOpen(false);
    localStorage.setItem(MODAL_SEEN_KEY, 'true');
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div className="fixed inset-0 z-[110] flex items-center justify-center px-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={dismiss} />

            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              className="relative w-full max-w-md rounded-3xl border border-[#d8d8d8] bg-card p-6 shadow-2xl"
            >
              <div className="absolute -top-10 right-4 rounded-full bg-[#bde4ff] p-3 border-2 border-black/10">
                <PartyPopper className="h-5 w-5 text-black" />
              </div>

              <div className="mb-4 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#f58fc6]" />
                <p className="text-xs font-semibold uppercase tracking-wide text-[#6f6f6f]">Heads up</p>
              </div>

              <h2 className="text-2xl font-black leading-tight text-[#7f7bff]">A playful Children&apos;s Day theme is landing on May 21 🎉</h2>

              <p className="mt-3 text-sm leading-relaxed text-foreground/85">
                We are bringing a fresh app look to celebrate Children&apos;s Day. It will feel playful, colorful, and fun.
              </p>

              <p className="mt-2 text-sm leading-relaxed text-foreground/85">
                Small note from us: life is not only work-work. Let&apos;s celebrate together a little.
              </p>

              <p className="mt-2 text-sm leading-relaxed text-foreground/85">
                The new look starts <span className="font-semibold">May 21</span> and stays for <span className="font-semibold">one full week</span>.
                Also, there will be an in-app game on <span className="font-semibold">May 27 (Children&apos;s Day)</span> where you can win small children treats.
              </p>

              <div className="mt-4 rounded-2xl border border-black/10 bg-[#fff7c9] p-3">
                <p className="text-xs font-semibold text-black/75">Theme preview colors</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[
                    ['Bubblegum Pink', '#f8b6d7'],
                    ['Baby Blue', '#bde4ff'],
                    ['Mint Green', '#c8f2d9'],
                    ['Lavender', '#d6ccff'],
                    ['Peach', '#ffd3b6'],
                  ].map(([label, color]) => (
                    <span key={label} className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-2.5 py-1 text-xs font-medium text-black">
                      <span className="h-3 w-3 rounded-full border border-black/20" style={{ backgroundColor: color }} />
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              <button
                onClick={dismiss}
                className="mt-5 w-full rounded-2xl border-2 border-black/20 border-b-4 border-b-[#7f7bff] bg-[#fef3ff] py-3 text-sm font-semibold text-black transition-transform active:translate-y-[1px]"
              >
                Nice, can&apos;t wait ✨
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {enabled && (
        <motion.div
          drag
          dragMomentum={false}
          dragConstraints={{ top: -220, left: -160, right: 160, bottom: 220 }}
          className="fixed right-4 top-1/2 z-[109]"
          style={{ x: 0, y: 0 }}
        >
          <motion.button
            onClick={() => setIsFabExpanded((prev) => !prev)}
            className="relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-background/50 text-primary-foreground shadow-xl"
            style={{ backgroundColor: 'hsl(var(--primary))' }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="text-[10px] font-bold leading-tight text-center px-1">{launchPassed ? 'Live now!' : `${countdown.days}d ${countdown.hours}h`}</span>
          </motion.button>

          <AnimatePresence>
            {isFabExpanded && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 8 }}
                className="absolute right-0 mt-2 w-56 rounded-2xl border border-border bg-card p-3 shadow-xl"
              >
                <div className="flex items-start gap-2">
                  <CalendarDays className="mt-0.5 h-4 w-4 text-primary" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">Children&apos;s Day theme countdown</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {launchPassed
                        ? 'The Children\'s Day theme is now live. Enjoy the playful look!'
                        : `${countdown.days}d ${countdown.hours}h ${countdown.minutes}m ${countdown.seconds}s to launch on May 21.`}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </>
  );
}
