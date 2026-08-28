import { useState, useEffect, useCallback } from 'react';
import { Sparkles, Gift } from 'lucide-react';
import { toast } from 'sonner';

interface ChildrensDayModalProps {
  identityConfirmed: boolean;
  openRequestId?: number;
}

function CelebrationIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Balloon 1 */}
      <circle cx="20" cy="16" r="6" className="fill-pink-400" />
      <line x1="20" y1="22" x2="18" y2="40" className="stroke-pink-400" strokeWidth="1.5" />

      {/* Balloon 2 */}
      <circle cx="32" cy="12" r="6" className="fill-yellow-400" />
      <line x1="32" y1="18" x2="32" y2="40" className="stroke-yellow-400" strokeWidth="1.5" />

      {/* Balloon 3 */}
      <circle cx="44" cy="16" r="6" className="fill-sky-400" />
      <line x1="44" y1="22" x2="46" y2="40" className="stroke-sky-400" strokeWidth="1.5" />

      {/* Gift box */}
      <rect x="24" y="44" width="16" height="14" rx="1" className="fill-orange-300 stroke-orange-500" strokeWidth="2" />
      <rect x="30" y="43" width="4" height="16" className="fill-yellow-300" />

      {/* Sparkles */}
      <circle cx="16" cy="30" r="1.5" className="fill-yellow-400" opacity="0.8" />
      <circle cx="48" cy="28" r="1.5" className="fill-pink-400" opacity="0.8" />
    </svg>
  );
}

export function ChildrensDayModal({
  identityConfirmed,
  openRequestId,
}: ChildrensDayModalProps) {
  const [visible, setVisible] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);
  const [openedFromButton, setOpenedFromButton] = useState(false);

  useEffect(() => {
    if (!openRequestId || !identityConfirmed) return;

    setOpenedFromButton(true);
    setVisible(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setFadeIn(true));
    });
  }, [openRequestId, identityConfirmed]);

  const dismiss = useCallback(() => {
    setFadeIn(false);
    setTimeout(() => {
      setVisible(false);
      setOpenedFromButton(false);
    }, 350);
  }, []);

  const handleClose = useCallback(() => {
    toast('See you on Children\'s Day! 🎉', { duration: 3000 });
    dismiss();
  }, [dismiss]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-400"
        style={{ opacity: fadeIn ? 1 : 0 }}
        onClick={dismiss}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-sm transition-all duration-400 ease-out"
        style={{
          opacity: fadeIn ? 1 : 0,
          transform: fadeIn
            ? 'scale(1) translateY(0)'
            : 'scale(0.95) translateY(8px)',
        }}
      >
        <div className="bg-card border border-border rounded-2xl p-6 shadow-xl overflow-hidden">
          {/* Decorative glow */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full opacity-15 pointer-events-none"
            style={{
              background:
                'radial-gradient(circle, hsl(var(--accent) / 0.6) 0%, transparent 70%)',
              filter: 'blur(40px)',
            }}
          />

          <div className="flex flex-col items-center text-center relative">
            {/* Celebration Icon */}
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-pink-100/50 to-yellow-100/50 border border-pink-200/50 flex items-center justify-center mb-4">
              <CelebrationIcon className="h-12 w-12" />
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold bg-gradient-to-r from-pink-500 via-yellow-500 to-sky-500 bg-clip-text text-transparent leading-snug">
              Surprise! New Design Coming
            </h2>

            {/* Date highlight */}
            <div className="mt-3 inline-block bg-pink-100/60 text-pink-700 px-3 py-1.5 rounded-full text-sm font-semibold">
              May 21st 🎊
            </div>

            {/* Main message */}
            <p className="text-sm text-muted-foreground mt-4 leading-relaxed max-w-[280px]">
              We&apos;re bringing a playful <span className="font-semibold text-foreground">Children&apos;s Day theme</span> to celebrate the fun side of work. Colorful, playful, and totally fresh.
            </p>

            {/* Details section */}
            <div className="mt-5 space-y-2 w-full text-left bg-muted/30 rounded-xl p-3.5">
              <div className="flex gap-2 items-start">
                <Gift className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-semibold text-foreground">Fun Design Stays for a Week</p>
                  <p className="text-muted-foreground">The theme will run until May 28th</p>
                </div>
              </div>
              
              <div className="flex gap-2 items-start">
                <Sparkles className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-semibold text-foreground">Win Treats on May 27th</p>
                  <p className="text-muted-foreground">Play our special game and win small children treats</p>
                </div>
              </div>
            </div>

            {/* Closing message */}
            <p className="text-xs text-muted-foreground mt-4 italic max-w-[270px]">
              Everything no be work work ✨ Sometimes we just want to celebrate fun moments together.
            </p>

            {/* Button with colorful bottom border */}
            <button
              onClick={handleClose}
              className="mt-5 w-full h-12 rounded-xl bg-gradient-to-r from-pink-400 to-yellow-400 text-white text-sm font-bold flex items-center justify-center hover:opacity-90 active:scale-[0.97] transition-all relative overflow-hidden shadow-md"
              style={{
                borderBottom: '4px solid hsl(var(--accent))',
                boxShadow: '0 4px 0 0 hsl(var(--accent) / 0.3), 0 2px 8px rgba(0,0,0,0.15)',
              }}
            >
              <span className="flex gap-2 items-center">
                <span>Let&apos;s Celebrate 🎉</span>
              </span>
            </button>

            {/* Dismiss hint */}
            <button
              onClick={dismiss}
              className="mt-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              I&apos;ll check it out later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
