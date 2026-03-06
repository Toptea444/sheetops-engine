import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { PinEntryStep } from './PinEntryStep';
import { PinSetupStep } from './PinSetupStep';
import { useWorkerPin } from '@/hooks/useWorkerPin';
import { LoadingState } from './LoadingState';

interface SessionPinGateProps {
  open: boolean;
  workerId: string;
  onVerified: () => void;
  onSwitchUser: () => void;
}

/**
 * Shown on every new browser session for returning users.
 * Forces PIN verification (or setup if PIN was reset by admin).
 */
export function SessionPinGate({ open, workerId, onVerified, onSwitchUser }: SessionPinGateProps) {
  const { isLoading, checkPinExists, setPin, verifyPin, error } = useWorkerPin();
  const [step, setStep] = useState<'loading' | 'pin-entry' | 'pin-setup'>('loading');

  useEffect(() => {
    if (!open || !workerId) return;

    const check = async () => {
      setStep('loading');
      const exists = await checkPinExists(workerId);
      setStep(exists ? 'pin-entry' : 'pin-setup');
    };
    check();
  }, [open, workerId, checkPinExists]);

  const handlePinVerify = async (pin: string) => {
    const result = await verifyPin(workerId, pin);
    if (result.valid) {
      onVerified();
    }
  };

  const handlePinSetup = async (pin: string) => {
    const result = await setPin(workerId, pin);
    if (result.success) {
      onVerified();
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        {step === 'loading' && (
          <div className="py-8">
            <LoadingState message="Checking account..." />
          </div>
        )}

        {step === 'pin-entry' && (
          <PinEntryStep
            workerId={workerId}
            onSubmit={handlePinVerify}
            onBack={onSwitchUser}
            isLoading={isLoading}
            error={error}
          />
        )}

        {step === 'pin-setup' && (
          <PinSetupStep
            workerId={workerId}
            onSubmit={handlePinSetup}
            isLoading={isLoading}
            error={error}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
