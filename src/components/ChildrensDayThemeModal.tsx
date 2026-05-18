import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, Gift, PartyPopper } from 'lucide-react';

const EVENT_DATE = new Date('2026-05-21T00:00:00');
const EVENT_DATE_LABEL = 'May 21';
const STORAGE_KEY = 'childrens-day-theme-dismissed-v1';

interface ChildrensDayThemeModalProps {
  identityConfirmed: boolean;
}

function getTimeLeft() {
  const now = new Date();
  const diff = EVENT_DATE.getTime() - now.getTime();

  if (diff <= 0) {
    return { ended: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return { ended: false, days, hours, minutes, seconds };
}

const swatchColors = [
  { name: 'Bubblegum Pink', value: '#F5B5C8' },
  { name: 'Baby Blue', value: '#BFDDF5' },
  { name: 'Mint Green', value: '#BFE8D2' },
  { name: 'Lemon Yellow', value: '#F7EEA8' },
  { name: 'Lavender', value: '#D9CCF4' },
  { name: 'Peach', value: '#F8D3B6' },
];

export function ChildrensDayThemeModal({
  identityConfirmed,
}: ChildrensDayThemeModalProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCountdownOpen, setIsCountdownOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState(getTimeLeft());

  useEffect(() => {
    if (!identityConfirmed) return;

    const dismissed = localStorage.getItem(STORAGE_KEY) === 'true';
    if (!dismissed) {
      setIsModalOpen(true);
    }
  }, [identityConfirmed]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(getTimeLeft());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const shortCountdown = useMemo(() => {
    if (timeLeft.ended) return 'Live!';
    if (timeLeft.days > 0) return `${timeLeft.days}d`;
    return `${String(timeLeft.hours).padStart(2, '0')}h`;
  }, [timeLeft]);

  const closeModal = () => {
    setIsModalOpen(false);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  if (!identityConfirmed) return null;

  return (
    <>
      {isModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeModal}
          />

          <div className="relative w-full max-w-md rounded-3xl border-2 border-[#D9CCF4] bg-card p-6 shadow-2xl">
            <div className="absolute -top-8 left-1/2 flex -translate-x-1/2 items-center justify-center rounded-2xl border-2 border-[#F5B5C8] bg-[#FFF8F1] px-4 py-2 shadow-md">
              <PartyPopper className="mr-2 h-4 w-4 text-[#DB7FA4]" />
              <span className="text-sm font-bold text-black">New Theme Alert</span>
            </div>

            <div className="mt-8 text-center">
              <h2 className="text-2xl font-extrabold leading-tight text-black">
                <span className="text-[#DB7FA4]">Big Little Surprise!</span>
                <br />
                Children&apos;s Day theme lands on {EVENT_DATE_LABEL}
              </h2>

              <p className="mt-3 text-sm leading-relaxed text-black/80">
                We are bringing a playful look to the app to celebrate Children&apos;s Day.
                Everything no be work work 😄. Let&apos;s enjoy small fun together.
              </p>

              <div className="mt-4 rounded-2xl border-2 border-[#BFDDF5] bg-[#FFF8F1] p-4 text-left">
                <p className="flex items-start gap-2 text-sm text-black">
                  <CalendarDays className="mt-0.5 h-4 w-4 text-[#6C90B8]" />
                  The new design starts on <strong>May 21</strong> and stays for one full week.
                </p>
                <p className="mt-2 flex items-start gap-2 text-sm text-black">
                  <Gift className="mt-0.5 h-4 w-4 text-[#79A889]" />
                  On <strong>May 27</strong>, we will run an in-app game. Winners get small children treats.
                </p>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                {swatchColors.map((swatch) => (
                  <div
                    key={swatch.name}
                    className="rounded-full border-2 border-black/10 px-3 py-1 text-xs font-semibold text-black"
                    style={{ backgroundColor: swatch.value }}
                  >
                    {swatch.name}
                  </div>
                ))}
              </div>

              <button
                onClick={closeModal}
                className="mt-5 w-full rounded-2xl border-2 border-[#DB7FA4] border-b-4 border-b-[#B56786] bg-[#F5B5C8] px-4 py-3 text-sm font-bold text-black transition-transform active:translate-y-[1px]"
              >
                Nice! I&apos;m ready for the fun 🎉
              </button>
            </div>
          </div>
        </div>
      )}

      <motion.div
        drag
        dragMomentum={false}
        dragElastic={0.15}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed right-3 top-1/2 z-[109] -translate-y-1/2"
      >
        <button
          type="button"
          onClick={() => setIsCountdownOpen((prev) => !prev)}
          className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary/70 border-b-4 border-b-primary bg-primary text-xs font-bold text-primary-foreground shadow-lg"
          aria-label="Open countdown"
        >
          {shortCountdown}
        </button>

        {isCountdownOpen && (
          <div className="mt-2 w-56 rounded-2xl border border-border bg-card p-3 text-left shadow-xl">
            <p className="text-xs font-semibold text-muted-foreground">Children&apos;s Day theme countdown</p>
            {timeLeft.ended ? (
              <p className="mt-1 text-sm font-bold text-foreground">
                It&apos;s live now. Enjoy the playful look 🎈
              </p>
            ) : (
              <p className="mt-1 text-sm font-bold text-foreground">
                {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s left to May 21.
              </p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">Tap again to hide this card.</p>
          </div>
        )}
      </motion.div>
    </>
  );
}
