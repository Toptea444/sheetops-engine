import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bus, ChevronRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { TransportSubsidyData } from '@/hooks/useTransportSubsidy';

interface TransportSubsidyModalProps {
  open: boolean;
  hasExistingLink?: boolean;
  onComplete: (optedIn: boolean, kId?: string) => void;
  onFetchSubsidy: (kId: string) => Promise<TransportSubsidyData | null>;
  isLoading: boolean;
  error: string | null;
}

type Step = 'ask' | 'input' | 'declined';

export function TransportSubsidyModal({
  open,
  hasExistingLink = false,
  onComplete,
  onFetchSubsidy,
  isLoading,
  error,
}: TransportSubsidyModalProps) {
  const [visible, setVisible] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);
  const [step, setStep] = useState<Step>('ask');
  const [kId, setKId] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep('ask');
    setKId('');
    setLocalError(null);
    setVisible(true);
    setFadeIn(true);
  }, [open, hasExistingLink]);

  const dismiss = useCallback(() => {
    setFadeIn(false);
    setTimeout(() => setVisible(false), 350);
  }, []);

  const handleYes = () => setStep('input');

  const handleNo = () => {
    if (hasExistingLink) {
      dismiss();
      return;
    }
    setStep('declined');
  };

  const handleDeclinedDone = () => {
    onComplete(false);
    dismiss();
  };

  const handleSubmit = async () => {
    const trimmed = kId.trim();
    if (!trimmed) {
      setLocalError('Please enter your K ID');
      return;
    }
    if (!trimmed.toUpperCase().startsWith('K')) {
      setLocalError('ID must start with "K" (e.g. K5049)');
      return;
    }
    setLocalError(null);

    const result = await onFetchSubsidy(trimmed);
    if (result) {
      toast.success('Transport subsidy linked!');
      onComplete(true, trimmed);
      dismiss();
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-400"
        style={{ opacity: fadeIn ? 1 : 0 }}
        onClick={step === 'declined' ? handleDeclinedDone : undefined}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-sm transition-all duration-400 ease-out"
        style={{
          opacity: fadeIn ? 1 : 0,
          transform: fadeIn ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(8px)',
        }}
      >
        <div className="bg-card border border-border rounded-2xl p-6 shadow-xl overflow-hidden">
          {/* Decorative glow */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full opacity-20 pointer-events-none"
            style={{
              background: 'radial-gradient(circle, hsl(var(--primary) / 0.6) 0%, transparent 70%)',
              filter: 'blur(40px)',
            }}
          />

          <div className="flex flex-col items-center text-center relative">
            {/* Icon */}
            <div className="h-20 w-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
              <Bus className="h-10 w-10 text-primary" />
            </div>

            <AnimatePresence mode="wait">
              {step === 'ask' && (
                <motion.div
                  key="ask"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="w-full"
                >
                  <h2 className="text-lg font-bold text-foreground leading-snug">
                    Transport Subsidy
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed max-w-[260px] mx-auto">
                    {hasExistingLink
                      ? 'Your transport subsidy ID is already linked. Do you want to change it?'
                      : 'Would you like to see your transport subsidy details in the app?'}
                  </p>

                  <button
                    onClick={handleYes}
                    className="mt-5 w-full h-12 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.97] transition-all"
                  >
                    {hasExistingLink ? 'Yes, change ID' : 'Yes, set it up'}
                    <ChevronRight className="h-4 w-4" />
                  </button>

                  <button
                    onClick={handleNo}
                    className="mt-2.5 w-full h-11 rounded-2xl border border-border bg-background text-foreground text-sm font-medium hover:bg-muted/60 active:scale-[0.97] transition-all"
                  >
                    No thanks
                  </button>
                </motion.div>
              )}

              {step === 'input' && (
                <motion.div
                  key="input"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="w-full"
                >
                  <h2 className="text-lg font-bold text-foreground leading-snug">
                    Enter Your K ID
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed max-w-[260px] mx-auto">
                    This is your transport subsidy ID (e.g. K5049). It's different from your collector ID.
                  </p>

                  <div className="mt-4 w-full">
                    <input
                      type="text"
                      value={kId}
                      onChange={(e) => {
                        setKId(e.target.value);
                        setLocalError(null);
                      }}
                      placeholder="e.g. K5049"
                      className="w-full h-12 rounded-xl border border-border bg-background px-4 text-center text-lg font-mono font-semibold placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    />
                    {(localError || error) && (
                      <p className="text-xs text-destructive mt-2">{localError || error}</p>
                    )}
                  </div>

                  <button
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="mt-4 w-full h-12 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-60"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Looking up...
                      </>
                    ) : (
                      'Save & Continue'
                    )}
                  </button>

                  <button
                    onClick={() => setStep('ask')}
                    disabled={isLoading}
                    className="mt-2.5 w-full h-11 rounded-2xl border border-border bg-background text-foreground text-sm font-medium hover:bg-muted/60 active:scale-[0.97] transition-all disabled:opacity-60"
                  >
                    Go back
                  </button>
                </motion.div>
              )}

              {step === 'declined' && (
                <motion.div
                  key="declined"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="w-full"
                >
                  <h2 className="text-lg font-bold text-foreground leading-snug">
                    No Problem!
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed max-w-[260px] mx-auto">
                    You can always set up your transport subsidy later from the settings if you change your mind.
                  </p>

                  <button
                    onClick={handleDeclinedDone}
                    className="mt-5 w-full h-12 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.97] transition-all"
                  >
                    Got it
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
