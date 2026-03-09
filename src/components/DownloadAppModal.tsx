import { useState, useEffect, useCallback } from 'react';
import { Download } from 'lucide-react';
import { toast } from 'sonner';

interface DownloadAppModalProps {
  identityConfirmed: boolean;
  openRequestId?: number;
}

function ApkIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Phone body */}
      <rect
        x="16"
        y="4"
        width="32"
        height="56"
        rx="6"
        className="fill-primary/10 stroke-primary"
        strokeWidth="2.5"
      />
      {/* Screen */}
      <rect
        x="20"
        y="12"
        width="24"
        height="34"
        rx="2"
        className="fill-primary/5 stroke-primary/40"
        strokeWidth="1.5"
      />
      {/* Download arrow on screen */}
      <path
        d="M32 20v14m0 0l-5-5m5 5l5-5"
        className="stroke-primary"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Bottom bar on screen */}
      <line
        x1="26"
        y1="38"
        x2="38"
        y2="38"
        className="stroke-primary"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Home indicator */}
      <line
        x1="28"
        y1="52"
        x2="36"
        y2="52"
        className="stroke-primary/50"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function DownloadAppModal({
  identityConfirmed,
  openRequestId,
}: DownloadAppModalProps) {
  const [visible, setVisible] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);

  const [openedFromBanner, setOpenedFromBanner] = useState(false);

  useEffect(() => {
    if (!openRequestId || !identityConfirmed) return;

    setOpenedFromBanner(true);
    setVisible(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setFadeIn(true));
    });
  }, [openRequestId, identityConfirmed]);

  const dismiss = useCallback(() => {
    setFadeIn(false);
    setTimeout(() => {
      setVisible(false);
      setOpenedFromBanner(false);
    }, 350);
  }, [openedFromBanner]);

  const handleDownload = useCallback(() => {
    const link = document.createElement('a');
    link.href = '/bonus-calculator.apk';
    link.download = 'bonus-calculator.apk';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast('Download starting now', { duration: 3000 });

    setFadeIn(false);
    setTimeout(() => {
      setVisible(false);
      setOpenedFromBanner(false);
    }, 350);
  }, []);

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
          {/* Decorative glow behind icon */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full opacity-20 pointer-events-none"
            style={{
              background:
                'radial-gradient(circle, hsl(var(--primary) / 0.6) 0%, transparent 70%)',
              filter: 'blur(40px)',
            }}
          />

          <div className="flex flex-col items-center text-center relative">
            {/* APK Icon */}
            <div className="h-20 w-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
              <ApkIcon className="h-12 w-12" />
            </div>

            {/* Title */}
            <h2 className="text-lg font-bold text-foreground leading-snug">
              We Now Have An App!
            </h2>

            {/* Subtitle */}
            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed max-w-[260px]">
              Get the full experience on your phone. Download the app and track
              your earnings more comfortably.
            </p>

            {/* Download Button - full width, primary theme */}
            <button
              onClick={handleDownload}
              className="mt-5 w-full h-12 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.97] transition-all"
            >
              <Download className="h-4.5 w-4.5" />
              Download App
            </button>

            {/* Dismiss Button - white/outlined */}
            <button
              onClick={dismiss}
              className="mt-2.5 w-full h-11 rounded-2xl border border-border bg-background text-foreground text-sm font-medium hover:bg-muted/60 active:scale-[0.97] transition-all"
            >
              {"I'll download later"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
