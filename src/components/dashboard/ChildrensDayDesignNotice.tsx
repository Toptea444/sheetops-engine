import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type Countdown = {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isLive: boolean;
};

const TARGET_DATE = new Date('2026-05-21T00:00:00');
const STORAGE_KEY = 'childrenDayDesignNoticeSeen_v1';

const swatches = [
  { name: 'Bubblegum Pink', color: '#ff9ecf' },
  { name: 'Baby Blue', color: '#b8e5ff' },
  { name: 'Mint Green', color: '#b8f2d4' },
  { name: 'Lemon Yellow', color: '#fff3a8' },
  { name: 'Lavender', color: '#d8c6ff' },
  { name: 'Peach', color: '#ffd2b4' },
] as const;

const getCountdown = (): Countdown => {
  const now = Date.now();
  const diff = TARGET_DATE.getTime() - now;
  const totalMs = Math.max(diff, 0);

  const days = Math.floor(totalMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((totalMs / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((totalMs / (1000 * 60)) % 60);
  const seconds = Math.floor((totalMs / 1000) % 60);

  return {
    totalMs,
    days,
    hours,
    minutes,
    seconds,
    isLive: diff <= 0,
  };
};

export const ChildrensDayDesignNotice = () => {
  const [open, setOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [countdown, setCountdown] = useState<Countdown>(() => getCountdown());

  useEffect(() => {
    const hasSeen = localStorage.getItem(STORAGE_KEY) === 'true';
    if (!hasSeen) {
      setOpen(true);
    }
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCountdown(getCountdown());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const shortLabel = useMemo(() => {
    if (countdown.isLive) return '🎉 Live now';
    if (countdown.days > 0) return `${countdown.days}d ${countdown.hours}h`;
    return `${countdown.hours}h ${countdown.minutes}m`;
  }, [countdown]);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      localStorage.setItem(STORAGE_KEY, 'true');
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-lg border-2 border-black bg-[#fffafc]">
          <DialogHeader>
            <DialogTitle className="text-xl text-black">A fun new app look is coming 🎈</DialogTitle>
            <DialogDescription className="text-sm text-black/80">
              On <strong>May 21</strong>, we will roll out our Children&apos;s Day app theme.
              The app will have playful colors, soft candy styles, and a cute friendly vibe.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {swatches.map((swatch) => (
              <div
                key={swatch.name}
                className="rounded-2xl border-2 border-black p-3 text-center shadow-[0_4px_0_0_#000]"
                style={{ backgroundColor: swatch.color }}
              >
                <p className="text-xs font-semibold text-black">{swatch.name}</p>
              </div>
            ))}
          </div>

          <Button
            onClick={() => handleOpenChange(false)}
            className="mt-2 border-2 border-b-4 border-black bg-white text-black hover:bg-white/90"
          >
            Nice, got it
          </Button>
        </DialogContent>
      </Dialog>

      <motion.div
        drag
        dragMomentum={false}
        className="fixed bottom-6 right-4 z-50 cursor-grab active:cursor-grabbing"
        whileTap={{ scale: 0.97 }}
      >
        <button
          type="button"
          onClick={() => setShowDetails((prev) => !prev)}
          className="pointer-events-auto rounded-full border-2 border-b-4 border-black bg-[#fff3a8] px-4 py-2 text-xs font-bold text-black shadow-sm"
        >
          {countdown.isLive ? 'Theme is live 🎉' : `New theme in ${shortLabel}`}
        </button>

        {showDetails && (
          <div className="mt-2 w-56 rounded-2xl border-2 border-black bg-white p-3 text-xs text-black shadow-[0_6px_0_0_#000]">
            <p className="font-semibold">Children&apos;s Day theme countdown</p>
            <p className="mt-1 text-black/80">Launch date: May 21, 2026</p>
            {countdown.isLive ? (
              <p className="mt-2">The new design is now live. Enjoy ✨</p>
            ) : (
              <p className="mt-2">
                {countdown.days}d {countdown.hours}h {countdown.minutes}m {countdown.seconds}s left
              </p>
            )}
          </div>
        )}
      </motion.div>
    </>
  );
};
