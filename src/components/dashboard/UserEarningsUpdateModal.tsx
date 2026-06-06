import { useEffect, useState } from 'react';
import { BadgeDollarSign, CheckCircle2, Clock, Settings } from 'lucide-react';

interface Props {
  identityConfirmed: boolean;
}

const STORAGE_KEY = 'performanceTracker_userEarningsAdjustmentUpdateSeen_v1';

export function UserEarningsUpdateModal({ identityConfirmed }: Props) {
  const [visible, setVisible] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(10);

  useEffect(() => {
    if (!identityConfirmed || localStorage.getItem(STORAGE_KEY) === 'true') return;
    setVisible(true);
    setSecondsLeft(10);
    requestAnimationFrame(() => requestAnimationFrame(() => setFadeIn(true)));
  }, [identityConfirmed]);

  useEffect(() => {
    if (!visible || secondsLeft <= 0) return;
    const timer = window.setTimeout(() => setSecondsLeft((current) => current - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [visible, secondsLeft]);

  if (!visible) return null;

  const dismiss = () => {
    if (secondsLeft > 0) return;
    localStorage.setItem(STORAGE_KEY, 'true');
    setFadeIn(false);
    window.setTimeout(() => setVisible(false), 350);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-400" style={{ opacity: fadeIn ? 1 : 0 }} />
      <div className="relative w-full max-w-sm transition-all duration-400 ease-out" style={{ opacity: fadeIn ? 1 : 0, transform: fadeIn ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(8px)' }}>
        <div className="bg-card border border-border rounded-2xl p-6 shadow-xl overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full opacity-20 pointer-events-none" style={{ background: 'radial-gradient(circle, hsl(var(--primary) / 0.6) 0%, transparent 70%)', filter: 'blur(40px)' }} />

          <div className="flex flex-col items-center text-center relative">
            <div className="h-20 w-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
              <BadgeDollarSign className="h-10 w-10 text-primary" />
            </div>

            <h2 className="text-lg font-bold text-foreground leading-snug">New: You Can Adjust Your Own Earnings</h2>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              We added a simple way for you to correct your earnings without waiting for an admin.
            </p>

            <div className="mt-4 space-y-3 text-left w-full">
              <div className="rounded-xl border border-border bg-background/70 p-3 flex gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  If earnings show for a date you did not work, choose that date. The app will check the real sheets and deduct the exact amount from your total and from that date in your breakdown.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-background/70 p-3 flex gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  If you worked on another person’s ID, enter that ID and the date. The app will add the exact earnings to you, and the deduction will also show on the other account with a clear note.
                </p>
              </div>
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                <p className="text-xs text-foreground leading-relaxed">
                  To use it, tap the settings button beside the sheet selector: <span className="inline-flex h-7 w-7 align-middle rounded-md border border-border bg-background/90 items-center justify-center mx-1"><Settings className="h-3.5 w-3.5 text-muted-foreground" /></span> then choose <strong>Adjust my earnings</strong>.
                </p>
              </div>
            </div>

            <button onClick={dismiss} disabled={secondsLeft > 0} className="mt-5 w-full h-12 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-60 disabled:active:scale-100">
              {secondsLeft > 0 ? <><Clock className="h-4 w-4" /> Read first ({secondsLeft}s)</> : 'Okay, I understand'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
