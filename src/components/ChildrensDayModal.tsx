import { useCallback, useEffect, useMemo, useState } from 'react';
import { Gift, Info, Sparkles } from 'lucide-react';

interface ChildrensDayModalProps {
  identityConfirmed: boolean;
}

export function ChildrensDayModal({ identityConfirmed }: ChildrensDayModalProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!identityConfirmed) return;

    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [identityConfirmed]);

  const targetDate = useMemo(() => {
    const currentYear = now.getFullYear();
    const currentTarget = new Date(currentYear, 2, 27, 0, 0, 0, 0);

    if (now <= currentTarget) {
      return currentTarget;
    }

    return new Date(currentYear + 1, 2, 27, 0, 0, 0, 0);
  }, [now]);

  const countdown = useMemo(() => {
    const diff = targetDate.getTime() - now.getTime();
    const safeDiff = Math.max(diff, 0);

    const days = Math.floor(safeDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((safeDiff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((safeDiff / (1000 * 60)) % 60);
    const seconds = Math.floor((safeDiff / 1000) % 60);

    return { days, hours, minutes, seconds };
  }, [now, targetDate]);

  const closeAll = useCallback(() => {
    setIsMenuOpen(false);
    setIsModalOpen(false);
  }, []);

  const openInfoModal = useCallback(() => {
    setIsMenuOpen(false);
    setIsModalOpen(true);
  }, []);

  if (!identityConfirmed) return null;

  return (
    <>
      {(isMenuOpen || isModalOpen) && (
        <div className="fixed inset-0 z-[109] bg-black/30 backdrop-blur-[1px]" onClick={closeAll} />
      )}

      <div className="fixed bottom-6 right-6 z-[110] flex flex-col items-end gap-3">
        {isMenuOpen && (
          <div className="w-[260px] rounded-2xl border border-border bg-card p-4 shadow-xl">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Children&apos;s Day countdown</p>
            <div className="mt-2 grid grid-cols-4 gap-2 text-center">
              {[
                { label: 'Days', value: countdown.days },
                { label: 'Hrs', value: countdown.hours },
                { label: 'Min', value: countdown.minutes },
                { label: 'Sec', value: countdown.seconds },
              ].map((item) => (
                <div key={item.label} className="rounded-xl bg-muted/70 py-2">
                  <p className="text-sm font-bold text-foreground">{String(item.value).padStart(2, '0')}</p>
                  <p className="text-[10px] text-muted-foreground">{item.label}</p>
                </div>
              ))}
            </div>

            <button
              onClick={openInfoModal}
              className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              <Info className="h-4 w-4" />
              Children&apos;s Day info
            </button>
          </div>
        )}

        <button
          onClick={() => setIsMenuOpen((prev) => !prev)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
          aria-label="Open Children's Day actions"
        >
          <Gift className="h-6 w-6" />
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center px-4">
          <div className="relative w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-primary/20 bg-primary/15">
              <Sparkles className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-center text-xl font-extrabold">🎉 Children&apos;s Day Update</h2>
            <p className="mt-3 text-center text-sm leading-relaxed text-muted-foreground">
              We&apos;re preparing special Children&apos;s Day celebration vibes for everyone.
            </p>
            <p className="mt-3 text-center text-sm leading-relaxed text-muted-foreground">
              A brand-new game is on the way — <span className="font-semibold text-foreground">Coming soon</span>.
            </p>
            <button
              onClick={() => setIsModalOpen(false)}
              className="mt-5 h-11 w-full rounded-2xl bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
