import { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';

interface Props {
  identityConfirmed: boolean;
}

const STORAGE_KEY = 'performanceTracker_seenSupportChatUpdate_v1';
const DISABLE_SECONDS = 8;

export function SupportUpdateModal({ identityConfirmed }: Props) {
  const [visible, setVisible] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(DISABLE_SECONDS);

  useEffect(() => {
    if (!identityConfirmed) return;
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(STORAGE_KEY) === 'true') return;

    // Wait a beat so it doesn't clash with intro / other openers
    const timer = setTimeout(() => {
      setVisible(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setFadeIn(true)));
    }, 2200);
    return () => clearTimeout(timer);
  }, [identityConfirmed]);

  useEffect(() => {
    if (!visible) return;
    setSecondsLeft(DISABLE_SECONDS);
    const interval: ReturnType<typeof setInterval> = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) { clearInterval(interval); return 0; }
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
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-400"
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
            className="absolute top-0 left-1/2 -translate-x-1/2 w-56 h-56 rounded-full opacity-25 pointer-events-none"
            style={{ background: 'radial-gradient(circle, hsl(var(--primary) / 0.6) 0%, transparent 70%)', filter: 'blur(50px)' }}
          />

          <div className="flex flex-col items-center text-center relative">
            {/* Big icon with orbiting dot */}
            <div className="relative mb-5">
              <div className="h-24 w-24 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <MessageCircle className="h-12 w-12 text-primary" strokeWidth={1.8} />
              </div>
              <span className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center border-4 border-card animate-pulse">
                1
              </span>
            </div>

            <h2 className="text-lg font-bold text-foreground leading-snug">
              New Feature Available
            </h2>

            <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
              You can now reach out to me directly whenever you have any issue with the app, or you don't understand something you're seeing.
            </p>

            <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
              Just tap the <span className="inline-flex items-center justify-center h-5 w-5 rounded-md bg-primary text-primary-foreground align-middle mx-0.5"><MessageCircle className="h-3 w-3" /></span> button at the bottom-right corner and send me a message. I'll reply as soon as I can.
            </p>

            <button
              onClick={dismiss}
              disabled={disabled}
              className="mt-6 w-full h-12 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              {disabled ? `Please read it… (${secondsLeft}s)` : 'Okay, got it'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
