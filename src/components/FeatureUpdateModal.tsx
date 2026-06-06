import { useEffect, useState } from 'react';
import { Settings, CalendarX, UserPlus } from 'lucide-react';

interface Props {
  identityConfirmed: boolean;
}

const STORAGE_KEY = 'performanceTracker_seenUserAdjustmentsUpdate_v1';
const DISABLE_SECONDS = 10;

function AdjustIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Calendar body */}
      <rect x="8" y="14" width="48" height="44" rx="5" className="fill-primary/10 stroke-primary" strokeWidth="2.5" />
      {/* Top binder strip */}
      <rect x="8" y="14" width="48" height="9" rx="5" className="fill-primary/20 stroke-primary" strokeWidth="2.5" />
      {/* Rings */}
      <line x1="20" y1="6" x2="20" y2="20" className="stroke-primary" strokeWidth="3" strokeLinecap="round" />
      <line x1="44" y1="6" x2="44" y2="20" className="stroke-primary" strokeWidth="3" strokeLinecap="round" />
      {/* Plus circle (lower-right) */}
      <circle cx="44" cy="42" r="9" className="fill-primary stroke-primary" strokeWidth="2" />
      <path d="M44 37v10M39 42h10" className="stroke-primary-foreground" strokeWidth="2.5" strokeLinecap="round" />
      {/* Minus circle (lower-left) */}
      <circle cx="20" cy="42" r="9" className="fill-background stroke-primary" strokeWidth="2.5" />
      <path d="M15 42h10" className="stroke-primary" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function FeatureUpdateModal({ identityConfirmed }: Props) {
  const [visible, setVisible] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(DISABLE_SECONDS);

  useEffect(() => {
    if (!identityConfirmed) return;
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(STORAGE_KEY) === 'true') return;

    const timer = setTimeout(() => {
      setVisible(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setFadeIn(true)));
    }, 1500);
    return () => clearTimeout(timer);
  }, [identityConfirmed]);

  useEffect(() => {
    if (!visible) return;
    setSecondsLeft(DISABLE_SECONDS);
    const interval: ReturnType<typeof setInterval> = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(interval);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [visible]);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setFadeIn(false);
    setTimeout(() => setVisible(false), 350);
  };

  if (!visible) return null;
  const disabled = secondsLeft > 0;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-400"
        style={{ opacity: fadeIn ? 1 : 0 }}
      />
      <div
        className="relative w-full max-w-sm transition-all duration-400 ease-out"
        style={{
          opacity: fadeIn ? 1 : 0,
          transform: fadeIn ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(8px)',
        }}
      >
        <div className="bg-card border border-border rounded-2xl p-6 shadow-xl overflow-hidden relative">
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full opacity-20 pointer-events-none"
            style={{ background: 'radial-gradient(circle, hsl(var(--primary) / 0.6) 0%, transparent 70%)', filter: 'blur(40px)' }}
          />

          <div className="flex flex-col items-center text-center relative">
            <div className="h-20 w-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
              <AdjustIcon className="h-12 w-12" />
            </div>

            <h2 className="text-lg font-bold text-foreground leading-snug">
              New: Adjust your earnings yourself
            </h2>

            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              You can now fix your earnings without waiting for admin. Two simple things you can do:
            </p>

            <div className="w-full mt-4 space-y-2.5 text-left">
              <div className="flex gap-3 p-3 rounded-xl border border-border bg-background/60">
                <div className="h-8 w-8 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 flex items-center justify-center shrink-0">
                  <CalendarX className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">Mark a day you didn't work</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                    Pick the date and we'll fetch what was on the sheets for you that day and remove it from your total.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 p-3 rounded-xl border border-border bg-background/60">
                <div className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center shrink-0">
                  <UserPlus className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">Add a day you worked on someone else's ID</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                    Type the ID and the date. We pull that day's earnings, add them to you and remove them from the other person. You'll confirm before it saves.
                  </p>
                </div>
              </div>
            </div>

            <div className="w-full mt-4 p-3 rounded-xl bg-muted/50 border border-border">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                To open it, tap the{' '}
                <span className="inline-flex items-center justify-center h-5 w-5 rounded-md border border-border bg-background align-middle mx-0.5">
                  <Settings className="h-3 w-3 text-muted-foreground" />
                </span>{' '}
                settings button beside the sheet selector at the top.
              </p>
            </div>

            <button
              onClick={dismiss}
              disabled={disabled}
              className="mt-5 w-full h-12 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              {disabled ? `Please read it… (${secondsLeft}s)` : "Okay, got it"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
