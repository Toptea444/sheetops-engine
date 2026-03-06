import { useState } from 'react';
import { Shield, AlertTriangle, HelpCircle, ChevronDown, ChevronUp, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface PinSetupStepProps {
  workerId: string;
  onSubmit: (pin: string) => void;
  isLoading?: boolean;
  error?: string | null;
  /** If true, shows a message indicating the PIN was reset by admin */
  pinWasReset?: boolean;
}

export function PinSetupStep({ workerId, onSubmit, isLoading = false, error = null, pinWasReset = false }: PinSetupStepProps) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [isWhyOpen, setIsWhyOpen] = useState(false);

  const displayError = error || localError;

  const validateAndSubmit = () => {
    setLocalError(null);

    // Validate PIN format
    if (!/^\d{4,6}$/.test(pin)) {
      setLocalError('PIN must be 4-6 digits');
      return;
    }

    // Validate confirmation match
    if (pin !== confirmPin) {
      setLocalError('PINs do not match');
      return;
    }

    onSubmit(pin);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && pin && confirmPin) {
      validateAndSubmit();
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Shield className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">
          {pinWasReset ? 'Set a New PIN' : 'Secure Your Account'}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {pinWasReset ? (
            <>Your PIN was reset. Please set a new PIN for <span className="font-medium text-foreground">{workerId}</span></>
          ) : (
            <>Setting up PIN for <span className="font-medium text-foreground">{workerId}</span></>
          )}
        </p>
      </div>

      {/* PIN Reset Notice */}
      {pinWasReset && (
        <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3">
          <div className="flex gap-2">
            <AlertTriangle className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-800 dark:text-blue-200">PIN Reset by Admin</p>
              <p className="text-blue-700 dark:text-blue-300 mt-0.5">
                Your previous PIN has been cleared. You'll need to create a new one to continue using the app.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Warning */}
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
        <div className="flex gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-amber-800 dark:text-amber-200">Important</p>
            <p className="text-amber-700 dark:text-amber-300 mt-0.5">
              Once you set your PIN, this ID will be permanently linked to you. You won't be able to log out and use a different Worker ID.
            </p>
          </div>
        </div>
      </div>

      {/* PIN inputs */}
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="pin" className="text-sm">Create your PIN (4-6 digits)</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="pin"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="Enter 4-6 digits"
              value={pin}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setPin(value);
                setLocalError(null);
              }}
              onKeyDown={handleKeyDown}
              className="pl-10"
              disabled={isLoading}
              autoFocus
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPin" className="text-sm">Confirm your PIN</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="confirmPin"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="Re-enter your PIN"
              value={confirmPin}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setConfirmPin(value);
                setLocalError(null);
              }}
              onKeyDown={handleKeyDown}
              className="pl-10"
              disabled={isLoading}
            />
          </div>
        </div>

        {displayError && (
          <p className="text-sm text-destructive">{displayError}</p>
        )}
      </div>

      {/* Why am I setting a PIN? */}
      <Collapsible open={isWhyOpen} onOpenChange={setIsWhyOpen}>
        <CollapsibleTrigger asChild>
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-full justify-center">
            <HelpCircle className="h-4 w-4" />
            <span>Why am I setting a PIN?</span>
            {isWhyOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3">
          <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-2">
            <p className="font-medium text-foreground">Your privacy matters!</p>
            <p className="text-muted-foreground">
              While everyone has access to the shared Google Sheet, manually tracking someone else's progress there is tedious and time-consuming.
            </p>
            <p className="text-muted-foreground">
              However, this app makes viewing bonus data very easy and convenient. Without a PIN, someone could simply enter your Worker ID on their device and monitor your bonuses, goals, and performance trends without your knowledge.
            </p>
            <p className="text-muted-foreground">
              Your PIN ensures that <span className="font-medium text-foreground">only YOU</span> can access your personal dashboard, no matter which device or browser someone tries to use.
            </p>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Submit button */}
      <Button 
        onClick={validateAndSubmit} 
        className="w-full gap-2"
        disabled={isLoading || !pin || !confirmPin}
      >
        {isLoading ? 'Setting PIN...' : 'Set PIN & Continue'}
      </Button>
    </div>
  );
}
