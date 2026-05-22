import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Gift, Info, Sparkles, X } from 'lucide-react';

const getNextTargetDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const thisYearTarget = new Date(year, 4, 27, 0, 0, 0, 0);

  if (now <= thisYearTarget) return thisYearTarget;
  return new Date(year + 1, 4, 27, 0, 0, 0, 0);
};

const getCountdown = (targetDate: Date) => {
  const now = new Date();
  const diff = Math.max(0, targetDate.getTime() - now.getTime());

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hrs = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const min = Math.floor((diff / (1000 * 60)) % 60);
  const sec = Math.floor((diff / 1000) % 60);

  return { days, hrs, min, sec };
};

export function ChildrensDayFab() {
  const [panelOpen, setPanelOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [countdown, setCountdown] = useState(() => getCountdown(getNextTargetDate()));

  const targetDate = useMemo(() => getNextTargetDate(), []);

  const fabWrapRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(getCountdown(targetDate));
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  useEffect(() => {
    const onClickAway = (event: MouseEvent) => {
      const target = event.target as Node;
      const isInsideFab = fabWrapRef.current?.contains(target);
      const isInsidePanel = panelRef.current?.contains(target);
      const isInsideModal = modalRef.current?.contains(target);

      if (!isInsideFab && !isInsidePanel) {
        setPanelOpen(false);
      }

      if (!isInsideModal && !isInsideFab && !isInsidePanel) {
        setModalOpen(false);
      }
    };

    document.addEventListener('mousedown', onClickAway);
    return () => document.removeEventListener('mousedown', onClickAway);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[115]">
      <AnimatePresence>
        {panelOpen && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-auto fixed bottom-24 right-5 w-[300px] rounded-2xl border border-border/60 bg-background/95 p-4 shadow-xl backdrop-blur"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Children&apos;s Day Countdown</p>
              <button
                onClick={() => setPanelOpen(false)}
                className="rounded-full p-1.5 hover:bg-muted"
                aria-label="Close panel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 grid grid-cols-4 gap-2 text-center">
              {[
                { label: 'Days', value: countdown.days },
                { label: 'Hrs', value: countdown.hrs },
                { label: 'Min', value: countdown.min },
                { label: 'Sec', value: countdown.sec },
              ].map((item) => (
                <div key={item.label} className="rounded-xl bg-muted/70 p-2">
                  <div className="text-base font-bold leading-none">{String(item.value).padStart(2, '0')}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">{item.label}</div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setModalOpen(true)}
              className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              <Info className="h-4 w-4" />
              More info
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {modalOpen && (
          <motion.div
            className="pointer-events-auto fixed inset-0 flex items-center justify-center px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div
              ref={modalRef}
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              className="relative z-10 w-full max-w-md rounded-2xl border border-border/60 bg-background p-6 shadow-xl"
            >
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-center text-lg font-bold">Children&apos;s Day Special</h3>
              <p className="mt-2 text-center text-sm text-muted-foreground">
                We&apos;re preparing a fun Children&apos;s Day game experience for everyone.
              </p>
              <p className="mt-2 text-center text-sm font-semibold text-foreground">🎮 Game: Coming soon.</p>
              <button
                onClick={() => setModalOpen(false)}
                className="mt-5 w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground"
              >
                Got it
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        ref={fabWrapRef}
        className="pointer-events-auto fixed bottom-5 right-5"
        drag
        dragMomentum={false}
        whileTap={{ scale: 0.95 }}
      >
        <button
          onClick={() => {
            setPanelOpen((prev) => !prev);
            setModalOpen(false);
          }}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
          aria-label="Open children's day countdown"
        >
          <Gift className="h-6 w-6" />
        </button>
      </motion.div>
    </div>
  );
}
