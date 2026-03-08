import { useState, useEffect } from 'react';
import { User, ArrowRight, Sparkles, ShieldCheck, LogOut, AlertTriangle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { PinSetupStep } from './PinSetupStep';
import { PinEntryStep } from './PinEntryStep';
import { useWorkerPin } from '@/hooks/useWorkerPin';

type ModalStep = 'id-entry' | 'identity-confirm' | 'pin-setup' | 'pin-entry';

interface WelcomeModalProps {
  open: boolean;
  onComplete: (userId: string, userName: string | null, pinVerified: boolean) => void;
  isValidating?: boolean;
  validationError?: string | null;
  onIdValidated?: (userId: string) => Promise<{ valid: boolean; userName?: string }>;
  onForgotPin?: (workerId: string) => void;
}

export function WelcomeModal({ 
  open, 
  onComplete, 
  isValidating = false,
  validationError = null,
  onIdValidated,
  onForgotPin,
  forceLoggedOut = false,
  onForceLoggedOutDismissed,
}: WelcomeModalProps) {
  const [userId, setUserId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<ModalStep>('id-entry');
  const [validatedUserId, setValidatedUserId] = useState<string>('');
  const [validatedUserName, setValidatedUserName] = useState<string | null>(null);
  const [showFinalWarning, setShowFinalWarning] = useState(false);
  const [needsPinSetup, setNeedsPinSetup] = useState(false);
  
  const { isLoading: pinLoading, checkPinExists, setPin, verifyPin, error: pinError } = useWorkerPin();

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setStep('id-entry');
      setValidatedUserId('');
      setValidatedUserName(null);
      setError(null);
      setShowFinalWarning(false);
      setNeedsPinSetup(false);
    }
  }, [open]);
  
  const displayError = error || validationError;

  const validateAndSubmit = async () => {
    const trimmedId = userId.trim().toUpperCase();
    
    if (!trimmedId) {
      setError('Please enter your Collector ID');
      return;
    }

    const pattern = /^[A-Z]{4}[A-Z0-9-]+$/;
    if (!pattern.test(trimmedId)) {
      setError('Invalid format. Expected format: NGDS0001 or GHAS-001');
      return;
    }

    setError(null);
    
    // Validate the ID exists in sheets
    if (onIdValidated) {
      const result = await onIdValidated(trimmedId);
      if (!result.valid) return;
      if (result.userName) setValidatedUserName(result.userName);
    }

    // Check if PIN exists for this worker
    const hasPinSet = await checkPinExists(trimmedId);
    setValidatedUserId(trimmedId);
    setNeedsPinSetup(!hasPinSet);

    // ALWAYS go to identity confirmation first
    setStep('identity-confirm');
  };

  const handleIdentityConfirmClick = () => {
    setShowFinalWarning(true);
  };

  const handleFinalConfirm = () => {
    setShowFinalWarning(false);
    // After identity confirmation, go to PIN entry or setup
    if (needsPinSetup) {
      setStep('pin-setup');
    } else {
      setStep('pin-entry');
    }
  };

  const handleIdentityDeny = () => {
    setStep('id-entry');
    setUserId('');
    setValidatedUserId('');
    setValidatedUserName(null);
    setNeedsPinSetup(false);
    setError(null);
  };

  const handlePinSetup = async (pin: string) => {
    const result = await setPin(validatedUserId, pin);
    if (result.success) {
      setStep('id-entry');
      onComplete(validatedUserId, validatedUserName, true);
    }
  };

  const handlePinVerify = async (pin: string) => {
    const result = await verifyPin(validatedUserId, pin);
    if (result.valid) {
      setStep('id-entry');
      onComplete(validatedUserId, validatedUserName, true);
    }
  };

  const handleBackToIdEntry = () => {
    setStep('id-entry');
    setUserId('');
    setValidatedUserId('');
    setValidatedUserName(null);
    setError(null);
  };

  const handleForgotPin = () => {
    if (onForgotPin) {
      onForgotPin(validatedUserId);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      validateAndSubmit();
    }
  };

  const isLoading = isValidating || pinLoading;

  const displayName = validatedUserName || validatedUserId;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        {forceLoggedOut && (
          <div className="mb-4 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
            <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">You have been logged out by an administrator.</p>
              <p className="text-xs text-muted-foreground mt-1">Please log in again to continue.</p>
            </div>
            <button 
              onClick={onForceLoggedOutDismissed} 
              className="text-muted-foreground hover:text-foreground shrink-0"
            >
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        )}
        {step === 'id-entry' && (
          <>
            <DialogHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <DialogTitle className="text-2xl">Welcome to Performance Tracker</DialogTitle>
              <DialogDescription className="text-base">
                Track your daily bonuses, set goals, and monitor your performance trends.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="userId" className="text-sm font-medium">
                  Enter your Collector ID
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="userId"
                    placeholder="e.g., NGDS0001 or GHAS-001"
                    value={userId}
                    onChange={(e) => {
                      setUserId(e.target.value.toUpperCase());
                      setError(null);
                    }}
                    onKeyDown={handleKeyDown}
                    className="pl-10 uppercase"
                    autoFocus
                    disabled={isLoading}
                  />
                </div>
                {displayError && (
                  <p className="text-sm text-destructive">{displayError}</p>
                )}
              </div>

              <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                <p>Your ID will be saved locally to personalize your dashboard and track your performance over time.</p>
              </div>
            </div>

            <Button 
              onClick={validateAndSubmit} 
              className="w-full gap-2"
              disabled={isLoading}
            >
              {isLoading ? (
                'Validating...'
              ) : (
                <>
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </>
        )}

        {step === 'identity-confirm' && (
          <>
            <DialogHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <ShieldCheck className="h-8 w-8 text-primary" />
              </div>
              <DialogTitle className="text-xl">Confirm Your Identity</DialogTitle>
              <DialogDescription className="text-base">
                Is this your account?
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <div className="rounded-lg bg-muted/50 p-4 text-center">
                <p className="text-lg font-semibold text-foreground">{displayName}</p>
                {validatedUserName && validatedUserName !== validatedUserId && (
                  <p className="text-sm text-muted-foreground">{validatedUserId}</p>
                )}
              </div>
              
              <p className="mt-4 text-sm text-muted-foreground text-center">
                {needsPinSetup 
                  ? 'To prevent unauthorized access, please confirm this is your account before setting up your PIN.'
                  : 'Please confirm this is your account before continuing.'
                }
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
                onClick={handleIdentityDeny}
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
            workerId={validatedUserId}
            onSubmit={handlePinSetup}
            isLoading={pinLoading}
            error={pinError}
          />
        )}

        {step === 'pin-entry' && (
          <PinEntryStep
            workerId={validatedUserId}
            onSubmit={handlePinVerify}
            onBack={handleBackToIdEntry}
            onForgotPin={handleForgotPin}
            isLoading={pinLoading}
            error={pinError}
          />
        )}
      </DialogContent>

      {/* Final warning confirmation */}
      <AlertDialog open={showFinalWarning} onOpenChange={setShowFinalWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/20">
              <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <AlertDialogTitle className="text-center">Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              {needsPinSetup ? (
                <>Once you set a PIN, <span className="font-semibold text-foreground">{displayName}</span> will be permanently linked to this device. You will not be able to switch to a different account.</>
              ) : (
                <>You are about to access the account for <span className="font-semibold text-foreground">{displayName}</span>. Please confirm this is your account.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <AlertDialogAction onClick={handleFinalConfirm} className="w-full">
              {needsPinSetup ? 'Yes, continue to set PIN' : 'Yes, continue'}
            </AlertDialogAction>
            <AlertDialogCancel className="w-full">Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
