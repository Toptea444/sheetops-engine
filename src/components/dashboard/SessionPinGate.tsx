import { useState, useEffect } from 'react';
import { ShieldCheck, LogOut, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { PinEntryStep } from './PinEntryStep';
import { PinSetupStep } from './PinSetupStep';
import { useWorkerPin } from '@/hooks/useWorkerPin';
import { LoadingState } from './LoadingState';

interface SessionPinGateProps {
  open: boolean;
  workerId: string;
  userName?: string | null;
  onVerified: (identityAlreadyConfirmed: boolean) => void;
  onSwitchUser: () => void;
  onForgotPin?: (workerId: string) => void;
  forgotPinSubmitted?: boolean;
}

/**
 * Shown on every new browser session for returning users.
 * Forces PIN verification (or setup if PIN was reset by admin).
 */
export function SessionPinGate({ open, workerId, userName, onVerified, onSwitchUser, onForgotPin, forgotPinSubmitted }: SessionPinGateProps) {
  const { isLoading, checkPinExists, setPin, verifyPin, error } = useWorkerPin();
  const [step, setStep] = useState<'loading' | 'pin-entry' | 'identity-confirm' | 'pin-setup'>('loading');
  const [showFinalWarning, setShowFinalWarning] = useState(false);
  const displayName = userName || workerId;

  useEffect(() => {
    if (!open || !workerId) return;

    const check = async () => {
      setStep('loading');
      setShowFinalWarning(false);
      const exists = await checkPinExists(workerId);
      if (exists) {
        setStep('pin-entry');
      } else {
        // PIN was reset - show identity confirmation first, then PIN setup
        setStep('identity-confirm');
      }
    };
    check();
  }, [open, workerId, checkPinExists]);

  const handlePinVerify = async (pin: string) => {
    const result = await verifyPin(workerId, pin);
    if (result.valid) {
      onVerified(true);
    }
  };

  const handlePinSetup = async (pin: string) => {
    const result = await setPin(workerId, pin);
    if (result.success) {
      onVerified(true);
    }
  };

  const handleIdentityConfirmClick = () => {
    setShowFinalWarning(true);
  };

  const handleFinalConfirm = () => {
    setShowFinalWarning(false);
    setStep('pin-setup');
  };

  const handleForgotPin = () => {
    if (onForgotPin) {
      onForgotPin(workerId);
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
            onForgotPin={handleForgotPin}
            forgotPinSubmitted={forgotPinSubmitted}
            isLoading={isLoading}
            error={error}
          />
        )}

        {step === 'identity-confirm' && (
          <>
            <DialogHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <ShieldCheck className="h-8 w-8 text-primary" />
              </div>
              <DialogTitle className="text-xl">PIN Reset Detected</DialogTitle>
              <DialogDescription className="text-base">
                Your PIN was reset. Please confirm this is your account before setting a new PIN.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <div className="rounded-lg bg-muted/50 p-4 text-center">
                <p className="text-lg font-semibold text-foreground">{displayName}</p>
                {userName && userName !== workerId && (
                  <p className="text-sm text-muted-foreground">{workerId}</p>
                )}
              </div>
              
              <p className="mt-4 text-sm text-muted-foreground text-center">
                Is this your account?
              </p>
            </div>

            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <Button 
                onClick={handleIdentityConfirmClick} 
                className="w-full gap-2"
              >
                <ShieldCheck className="h-4 w-4" />
                Yes, this is my account
              </Button>
              <Button 
                variant="outline"
                onClick={onSwitchUser}
                className="w-full gap-2 text-destructive hover:text-destructive"
              >
                <LogOut className="h-4 w-4" />
                No, use a different ID
              </Button>
            </DialogFooter>
          </>
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

      {/* Final warning confirmation for PIN reset users */}
      <AlertDialog open={showFinalWarning} onOpenChange={setShowFinalWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/20">
              <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <AlertDialogTitle className="text-center">Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Once you set a new PIN, <span className="font-semibold text-foreground">{displayName}</span> will continue to be linked to this device.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <AlertDialogAction onClick={handleFinalConfirm} className="w-full">
              Yes, continue to set PIN
            </AlertDialogAction>
            <AlertDialogCancel className="w-full">Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
