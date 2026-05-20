import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, Sparkles, Gift, PartyPopper } from 'lucide-react';

const THEME_LAUNCH_MONTH_INDEX = 4; // May
const THEME_LAUNCH_DAY = 21;

const swatches = [
  { name: 'Bubblegum Pink', color: '#F6A9D4' },
  { name: 'Baby Blue', color: '#9EDCFF' },
  { name: 'Mint Green', color: '#B8F2D0' },
  { name: 'Lemon Yellow', color: '#F7E79B' },
  { name: 'Lavender', color: '#CDB7F6' },
  { name: 'Peach', color: '#F6C4A8' },
];

function getLaunchDate() {
  const now = new Date();
  const year = now.getFullYear();
  const candidate = new Date(year, THEME_LAUNCH_MONTH_INDEX, THEME_LAUNCH_DAY, 0, 0, 0, 0);

  if (now.getTime() <= candidate.getTime()) return candidate;

  return new Date(year + 1, THEME_LAUNCH_MONTH_INDEX, THEME_LAUNCH_DAY, 0, 0, 0, 0);
}

function getCountdownText(target: Date) {
  const now = new Date().getTime();
  const distance = Math.max(0, target.getTime() - now);

  const days = Math.floor(distance / (1000 * 60 * 60 * 24));
  const hours = Math.floor((distance / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((distance / (1000 * 60)) % 60);

  if (distance <= 0) {
    return 'Live now 🎉';
  }

  if (days > 0) {
    return `${days}d ${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

export function ChildrensDayThemeModal() {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [countdownText, setCountdownText] = useState('');
  const launchDate = useMemo(() => getLaunchDate(), []);

  useEffect(() => {
    const shouldShow = localStorage.getItem('childrens-day-theme-modal-seen') !== 'true';
    if (shouldShow) {
      const t = window.setTimeout(() => setOpen(true), 700);
      return () => window.clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    setCountdownText(getCountdownText(launchDate));
    const interval = window.setInterval(() => {
      setCountdownText(getCountdownText(launchDate));
    }, 1000 * 30);

    return () => window.clearInterval(interval);
  }, [launchDate]);

  const closeModal = () => {
    localStorage.setItem('childrens-day-theme-modal-seen', 'true');
    setOpen(false);
  };

  const launchLabel = launchDate.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={closeModal} />

          <div className="relative w-full max-w-md rounded-3xl border border-black/10 bg-card p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-center">
              <div className="rounded-full border border-black/10 bg-[#FDF1F7] px-4 py-1 text-xs font-semibold text-black">
                New Theme Alert
              </div>
            </div>

            <h2 className="text-center text-2xl font-extrabold leading-tight text-[#A663CC]">
              🎈 Big Little Surprise is Coming!
            </h2>

            <p className="mt-3 text-center text-sm leading-relaxed text-foreground">
              On <strong>May 21</strong>, we are rolling out a special Children&apos;s Day app look.
              It will be playful, colorful, and extra cute.
            </p>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {swatches.map((swatch) => (
                <div
                  key={swatch.name}
                  className="flex h-12 items-center justify-center rounded-2xl border border-black/20 text-[11px] font-semibold text-black"
                  style={{ backgroundColor: swatch.color }}
                >
                  {swatch.name}
                </div>
              ))}
            </div>

            <div className="mt-5 space-y-2 rounded-2xl border border-black/10 bg-muted/50 p-4 text-sm leading-relaxed text-foreground">
              <p className="flex items-start gap-2"><PartyPopper className="mt-0.5 h-4 w-4 text-[#F08CB8]" />We just want to celebrate Children&apos;s Day together. Everything no be work work. 💛</p>
              <p className="flex items-start gap-2"><CalendarDays className="mt-0.5 h-4 w-4 text-[#73B2E8]" />The special design will stay for one full week after Children&apos;s Day.</p>
              <p className="flex items-start gap-2"><Gift className="mt-0.5 h-4 w-4 text-[#7CC89F]" />On <strong>May 27</strong>, there will be a small in-app game where you can win small children treats.</p>
            </div>

            <button
              onClick={closeModal}
              className="mt-5 h-12 w-full rounded-2xl border-2 border-black/60 border-b-[6px] border-b-[#A663CC] bg-[#FFF7C7] text-sm font-bold text-black transition active:translate-y-[1px]"
            >
              Nice! I can&apos;t wait 🎉
            </button>
          </div>
        </div>
      )}

      <motion.div
        drag
        dragMomentum={false}
        dragElastic={0.12}
        className="fixed right-3 top-1/2 z-[111] -translate-y-1/2"
        style={{ touchAction: 'none' }}
      >
        <button
          onClick={() => setExpanded((prev) => !prev)}
          className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-background bg-primary text-center text-[10px] font-extrabold text-primary-foreground shadow-xl"
          aria-label="Toggle theme launch countdown"
        >
          <span className="px-1 leading-tight">{countdownText}</span>
        </button>

        {expanded && (
          <div className="mt-2 w-56 -translate-x-24 rounded-2xl border border-border bg-card p-3 text-xs shadow-xl">
            <p className="font-semibold text-foreground">Children&apos;s Day Theme Countdown</p>
            <p className="mt-1 text-muted-foreground">Launch date: {launchLabel}</p>
            <p className="mt-1 text-muted-foreground">Special game date: May 27</p>
            <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" /> {countdownText}
            </p>
          </div>
        )}
      </motion.div>
    </>
  );
}
