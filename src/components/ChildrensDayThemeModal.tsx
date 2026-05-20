import { useCallback, useEffect, useMemo, useState } from 'react';
import { PartyPopper, Sparkles } from 'lucide-react';
import { motion, PanInfo } from 'framer-motion';

interface ChildrensDayThemeModalProps {
  identityConfirmed: boolean;
  openRequestId?: number;
}

const DESIGN_LAUNCH_DATE = new Date('2026-05-21T00:00:00');
const GAME_DATE = new Date('2026-05-27T00:00:00');
const STORAGE_KEY = 'performanceTracker_childrenThemeNoticeSeen_2026';

const formatCountdown = (targetDate: Date) => {
  const now = new Date();
  const total = targetDate.getTime() - now.getTime();

  if (total <= 0) {
    return { label: 'Live now', short: 'Now', isLive: true, total: 0, days: 0, hours: 0, mins: 0, secs: 0 };
  }

  const days = Math.floor(total / (1000 * 60 * 60 * 24));
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const mins = Math.floor((total / (1000 * 60)) % 60);
  const secs = Math.floor((total / 1000) % 60);

  return {
    label: `${days}d ${hours}h ${mins}m ${secs}s`,
    short: days > 0 ? `${days}d` : `${hours}h`,
    isLive: false,
    total,
    days,
    hours,
    mins,
    secs,
  };
};

export function ChildrensDayThemeModal({ identityConfirmed, openRequestId }: ChildrensDayThemeModalProps) {
  const [visible, setVisible] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);
  const [countdown, setCountdown] = useState(() => formatCountdown(DESIGN_LAUNCH_DATE));
  const [fabExpanded, setFabExpanded] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 110 });

  useEffect(() => {
    const timer = setInterval(() => setCountdown(formatCountdown(DESIGN_LAUNCH_DATE)), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!identityConfirmed) return;
    const seen = localStorage.getItem(STORAGE_KEY) === 'true';
    if (seen || openRequestId) return;

    setVisible(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setFadeIn(true)));
    localStorage.setItem(STORAGE_KEY, 'true');
  }, [identityConfirmed, openRequestId]);

  useEffect(() => {
    if (!openRequestId || !identityConfirmed) return;
    setVisible(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setFadeIn(true)));
  }, [openRequestId, identityConfirmed]);

  const dismiss = useCallback(() => {
    setFadeIn(false);
    setTimeout(() => setVisible(false), 300);
  }, []);

  const handleDragEnd = useCallback((_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setPosition((current) => ({ x: current.x + info.offset.x, y: current.y + info.offset.y }));
  }, []);

  const gameDateLabel = useMemo(() => {
    return GAME_DATE.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  }, []);

  return (
    <>
      <motion.div
        drag
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        style={{ x: position.x, y: position.y }}
        className="fixed right-3 top-28 z-[95]"
      >
        <button
          onClick={() => setFabExpanded((prev) => !prev)}
          className="h-16 w-16 rounded-full bg-primary text-primary-foreground border border-primary/50 shadow-[0_8px_20px_hsl(var(--primary)/0.35)] flex flex-col items-center justify-center text-[11px] font-semibold leading-none"
          aria-label="Children's Day theme countdown"
        >
          <span className="text-[9px]">Theme</span>
          <span>{countdown.short}</span>
        </button>

        {fabExpanded && (
          <div className="mt-2 w-56 rounded-2xl border border-border bg-card/95 backdrop-blur p-3 shadow-xl">
            <p className="text-xs font-semibold text-foreground">Children’s Day theme countdown</p>
            <p className="text-xs text-muted-foreground mt-1">New look drops on May 21, 2026.</p>
            <p className="text-sm font-bold text-foreground mt-2">{countdown.label}</p>
            <button
              onClick={() => {
                setVisible(true);
                requestAnimationFrame(() => requestAnimationFrame(() => setFadeIn(true)));
              }}
              className="mt-2 w-full rounded-xl border border-primary/40 bg-primary/10 text-primary text-xs py-2 font-medium"
            >
              Open full update
            </button>
          </div>
        )}
      </motion.div>

      {visible && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300"
            style={{ opacity: fadeIn ? 1 : 0 }}
            onClick={dismiss}
          />

          <div
            className="relative w-full max-w-md transition-all duration-300"
            style={{ opacity: fadeIn ? 1 : 0, transform: fadeIn ? 'scale(1) translateY(0)' : 'scale(0.96) translateY(10px)' }}
          >
            <div className="bg-card border border-border rounded-2xl p-6 shadow-xl overflow-hidden">
              <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-amber-200/45" />
              <div className="absolute -bottom-10 -left-10 h-36 w-36 rounded-full bg-sky-200/45" />

              <div className="relative">
                <div className="h-14 w-14 rounded-xl border border-rose-300/60 bg-rose-100/70 text-rose-700 flex items-center justify-center mb-4">
                  <PartyPopper className="h-7 w-7" />
                </div>

                <h2 className="text-xl font-bold leading-snug text-emerald-700">A playful new look is coming 🎉</h2>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  On <strong>May 21, 2026</strong>, we are rolling out a Children’s Day app theme with playful colors and fun vibes.
                </p>

                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 p-3">
                  <p className="text-sm text-amber-900 font-medium">Everything no be work work 😄</p>
                  <p className="text-xs text-amber-800/90 mt-1">
                    This is just us celebrating Children’s Day together. The special design stays for one full week.
                  </p>
                </div>

                <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50/70 p-3">
                  <p className="text-sm font-medium text-sky-900">Bonus fun on {gameDateLabel}</p>
                  <p className="text-xs text-sky-800/90 mt-1">
                    We will have a small in-app game. You can win small children treats on that day.
                  </p>
                </div>

                <button
                  onClick={dismiss}
                  className="mt-5 w-full h-11 rounded-xl border border-emerald-300 bg-emerald-100 text-emerald-900 text-sm font-semibold transition-all hover:bg-emerald-200 active:scale-[0.98] shadow-[0_5px_0_0_rgba(16,185,129,0.45)]"
                >
                  Nice! I can’t wait <Sparkles className="inline h-4 w-4 ml-1" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
