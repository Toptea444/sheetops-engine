import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'performanceTracker_childrensDayModalSeen_2026';

export const ChildrensDayModal = () => {
  const [open, setOpen] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setOpen(true);
    }
  }, []);

  const handleCelebrate = () => {
    setShowConfetti(true);
    localStorage.setItem(STORAGE_KEY, 'true');
    setTimeout(() => setOpen(false), 1400);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-foreground/40 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border-2 border-border bg-card shadow-2xl">
        <div className="h-44 w-full bg-[radial-gradient(circle_at_15%_20%,hsl(327_63%_76%)_0_34px,transparent_36px),radial-gradient(circle_at_83%_18%,hsl(205_64%_80%)_0_30px,transparent_32px),radial-gradient(circle_at_65%_70%,hsl(48_82%_81%)_0_34px,transparent_36px),radial-gradient(circle_at_25%_72%,hsl(128_42%_84%)_0_36px,transparent_38px)] flex items-center justify-center text-4xl">
          ⭐ ☁️ 💖 ✨
        </div>
        <div className="space-y-3 p-6 text-center">
          <h2 className="text-2xl font-extrabold">Happy Children&apos;s Day 🌈</h2>
          <p className="text-sm text-muted-foreground">
            May the childlike part of your heart stay brave, curious, and joyful — and may your work today be lighter, kinder, and full of little wins.
          </p>
          <p className="text-xs font-semibold text-foreground/80">
            🎉 This playful redesign is available for one week only.
          </p>
          <Button onClick={handleCelebrate} className="w-full">Send Me Some Joy</Button>
          {showConfetti && <p className="text-lg">🎊 🌟 🍭 🧸 🎈</p>}
        </div>
      </div>
    </div>
  );
};
