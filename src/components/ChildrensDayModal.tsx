import { useCallback, useEffect, useState } from 'react';
import { Gift, Sparkles } from 'lucide-react';

interface ChildrensDayModalProps {
  identityConfirmed: boolean;
}

const STORAGE_KEY = 'childrens_day_modal_seen_2026';

export function ChildrensDayModal({ identityConfirmed }: ChildrensDayModalProps) {
  const [visible, setVisible] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    if (!identityConfirmed) return;
    if (localStorage.getItem(STORAGE_KEY) === 'true') return;

    setVisible(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setFadeIn(true)));
  }, [identityConfirmed]);

  const dismiss = useCallback(() => {
    setFadeIn(false);
    localStorage.setItem(STORAGE_KEY, 'true');
    setTimeout(() => setVisible(false), 300);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300"
        style={{ opacity: fadeIn ? 1 : 0 }}
        onClick={dismiss}
      />

      <div
        className="relative w-full max-w-md transition-all duration-300"
        style={{
          opacity: fadeIn ? 1 : 0,
          transform: fadeIn ? 'scale(1) translateY(0)' : 'scale(0.96) translateY(10px)',
        }}
      >
        <div className="celebration-card celebration-blobs p-6 sm:p-7">
          <div className="relative z-10">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-primary/20 bg-primary/15">
              <Gift className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-center text-xl font-extrabold">🎉 Children&apos;s Day Design Update Is Here!</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground text-center">
              New playful design just landed for Children&apos;s Day celebrations. Everything no be work work,
              make we enjoy small fun too 😄.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground text-center">
              This special design will be removed on <span className="font-semibold text-foreground">June 3, 2026</span>.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground text-center">
              On <span className="font-semibold text-foreground">March 27</span> (Children&apos;s Day), we&apos;ll launch a spinning game
              where you can win real prizes, like children&apos;s treat.
            </p>

            <button
              onClick={dismiss}
              className="mt-5 w-full h-11 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all"
            >
              <Sparkles className="h-4 w-4" />
              Sounds fun, let&apos;s go!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
