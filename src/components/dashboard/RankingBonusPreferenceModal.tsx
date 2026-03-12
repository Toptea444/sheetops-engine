import { useEffect, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';

type PreferenceStep = 'question' | 'yes-confirm' | 'no-success';

interface RankingBonusPreferenceModalProps {
  open: boolean;
  isFromSettings?: boolean;
  currentPreference: boolean;
  onClose: () => void;
  onSavePreference: (includeInTotal: boolean) => void;
}

export function RankingBonusPreferenceModal({
  open,
  isFromSettings = false,
  currentPreference,
  onClose,
  onSavePreference,
}: RankingBonusPreferenceModalProps) {
  const [fadeIn, setFadeIn] = useState(false);
  const [step, setStep] = useState<PreferenceStep>('question');

  useEffect(() => {
    if (!open) {
      setFadeIn(false);
      setStep('question');
      return;
    }

    setStep('question');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setFadeIn(true));
    });
  }, [open]);

  const handleDismiss = () => {
    setFadeIn(false);
    setTimeout(() => {
      onClose();
    }, 250);
  };

  const handleInclude = () => {
    onSavePreference(true);
    setStep('yes-confirm');
  };

  const handleExclude = () => {
    onSavePreference(false);
    setStep('no-success');
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300"
        style={{ opacity: fadeIn ? 1 : 0 }}
        onClick={handleDismiss}
      />

      <div
        className="relative w-full max-w-sm transition-all duration-300 ease-out"
        style={{
          opacity: fadeIn ? 1 : 0,
          transform: fadeIn ? 'scale(1) translateY(0)' : 'scale(0.96) translateY(8px)',
        }}
      >
        <div className="bg-card border border-border rounded-2xl p-6 shadow-xl overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full opacity-20 pointer-events-none"
            style={{
              background:
                'radial-gradient(circle, hsl(var(--primary) / 0.55) 0%, transparent 70%)',
              filter: 'blur(40px)',
            }}
          />

          <div className="relative flex flex-col items-center text-center">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
              <SlidersHorizontal className="h-7 w-7 text-primary" />
            </div>

            {step === 'question' && (
              <>
                <h2 className="text-lg font-bold text-foreground leading-snug">
                  Ranking bonus in total earnings?
                </h2>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  Some users find the total earnings confusing when ranking bonus is added.
                  Do you want us to include ranking bonus inside your total earnings card?
                </p>
                {isFromSettings && (
                  <p className="text-xs text-muted-foreground mt-3">
                    Current setting: {currentPreference ? 'Included in total earnings' : 'Hidden from total earnings'}.
                  </p>
                )}

                <button
                  onClick={handleInclude}
                  className="mt-5 w-full h-12 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-[0.97] transition-all"
                >
                  I'm okay with it
                </button>
                <button
                  onClick={handleExclude}
                  className="mt-2.5 w-full h-11 rounded-2xl border border-border bg-background text-foreground text-sm font-medium hover:bg-muted/60 active:scale-[0.97] transition-all"
                >
                  No, I'd like to change it
                </button>
              </>
            )}

            {step === 'yes-confirm' && (
              <>
                <h2 className="text-lg font-bold text-foreground leading-snug">Preference saved</h2>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  Great. Ranking bonus will now be included in your total earnings.
                </p>
                <button
                  onClick={handleDismiss}
                  className="mt-5 w-full h-11 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-[0.97] transition-all"
                >
                  Done
                </button>
              </>
            )}

            {step === 'no-success' && (
              <>
                <h2 className="text-lg font-bold text-foreground leading-snug">Done, updated successfully</h2>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  Ranking bonus is now hidden from your total earnings card.
                  You can change this anytime with the settings button beside the sheet selector.
                  Your ranking bonus breakdown is still available in your earnings breakdown section.
                </p>
                <button
                  onClick={handleDismiss}
                  className="mt-5 w-full h-11 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-[0.97] transition-all"
                >
                  Got it
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
