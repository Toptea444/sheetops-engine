import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Sparkles, PartyPopper, Gift, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const THEME_LAUNCH_DATE = new Date('2026-05-21T00:00:00');

const formatCountdown = (targetDate: Date) => {
  const now = new Date();
  const diffMs = targetDate.getTime() - now.getTime();

  if (diffMs <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isLive: true };
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / (60 * 60 * 24));
  const hours = Math.floor((totalSeconds % (60 * 60 * 24)) / (60 * 60));
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds, isLive: false };
};

const swatches = [
  { name: 'Bubblegum Pink', color: '#ff85c1' },
  { name: 'Baby Blue', color: '#a7d8ff' },
  { name: 'Mint Green', color: '#b8f2d1' },
  { name: 'Lemon Yellow', color: '#fff3a7' },
  { name: 'Lavender', color: '#dac4ff' },
  { name: 'Peach', color: '#ffd1b3' },
];

export function ChildrensDayThemeAnnouncement() {
  const [openModal, setOpenModal] = useState(true);
  const [openCountdown, setOpenCountdown] = useState(false);
  const [countdown, setCountdown] = useState(() => formatCountdown(THEME_LAUNCH_DATE));
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(formatCountdown(THEME_LAUNCH_DATE));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const countdownLabel = useMemo(() => {
    if (countdown.isLive) return 'Live now';
    if (countdown.days > 0) return `${countdown.days}d`;
    if (countdown.hours > 0) return `${countdown.hours}h`;
    return `${countdown.minutes}m`;
  }, [countdown]);

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setPosition((prev) => ({
      x: prev.x + info.offset.x,
      y: prev.y + info.offset.y,
    }));
  };

  return (
    <>
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="sm:max-w-lg rounded-3xl border-2 border-[#ff9ecf] bg-gradient-to-b from-[#fff8fc] via-[#f7fbff] to-[#fffdf4] p-0 overflow-hidden">
          <div className="p-6 sm:p-7">
            <DialogHeader className="space-y-3 text-left">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1 text-sm font-semibold text-black">
                <Sparkles className="h-4 w-4 text-[#ff6bb1]" />
                Big happy update 🎉
              </div>
              <DialogTitle className="text-2xl leading-tight text-black">
                A playful Children&apos;s Day theme is coming on <span className="text-[#ff4fa5]">May 21</span>!
              </DialogTitle>
              <DialogDescription className="text-base text-black/80">
                We want to celebrate Children&apos;s Day together. Everything no be work work 😄.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-5 space-y-3 rounded-2xl border border-black/10 bg-white/90 p-4 text-sm text-black">
              <p>From <strong>May 21</strong>, the app will switch to a fun, playful look with soft candy colors and cute vibes.</p>
              <p>The theme stays live for <strong>one full week</strong> after Children&apos;s Day so we can all enjoy it.</p>
              <p className="flex items-start gap-2"><Gift className="mt-0.5 h-4 w-4 text-[#7f67ff]" />
                There will be a small in-app game on <strong>May 27</strong>. Play and win small children treats on that day.
              </p>
            </div>

            <div className="mt-5">
              <p className="mb-3 text-sm font-semibold text-black">Sneak peek palette</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {swatches.map((swatch) => (
                  <div key={swatch.name} className="rounded-2xl border border-black/10 bg-white p-2">
                    <div className="h-8 rounded-full border border-black/15" style={{ backgroundColor: swatch.color }} />
                    <p className="mt-1 text-xs font-semibold text-black">{swatch.name}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => setOpenModal(false)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-[#ff7ebf] border-b-4 border-b-[#7f67ff] bg-white px-4 py-3 text-sm font-bold text-black transition hover:-translate-y-0.5"
              >
                <PartyPopper className="h-4 w-4" />
                Nice! I can&apos;t wait
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <motion.div
        drag
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        animate={{ x: position.x, y: position.y }}
        className="fixed right-4 top-1/2 z-50"
      >
        <button
          type="button"
          onClick={() => setOpenCountdown((prev) => !prev)}
          className="h-16 w-16 rounded-full border-2 border-black/20 bg-gradient-to-br from-[#ff9fd0] via-[#a7d8ff] to-[#fff3a7] text-xs font-black text-black shadow-[0_6px_0_0_#7f67ff]"
          aria-label="Toggle countdown details"
        >
          {countdownLabel}
        </button>

        <AnimatePresence>
          {openCountdown && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 6 }}
              className="absolute right-0 mt-3 w-64 rounded-2xl border border-black/10 bg-white p-3 shadow-xl"
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-bold text-black">Countdown to May 21</p>
                <button className="rounded-md p-1 text-black/60 hover:bg-black/5" onClick={() => setOpenCountdown(false)}>
                  <X className="h-4 w-4" />
                </button>
              </div>
              {countdown.isLive ? (
                <p className="text-sm font-semibold text-[#ff4fa5]">It&apos;s live now 🎉</p>
              ) : (
                <p className="text-sm text-black/80">
                  {countdown.days}d {countdown.hours}h {countdown.minutes}m {countdown.seconds}s left.
                </p>
              )}
              <p className="mt-2 text-xs text-black/60">Tap and drag this bubble to move it anywhere.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}
