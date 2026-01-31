import { useState } from 'react';
import { Lock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PinEntryStepProps {
  workerId: string;
  onSubmit: (pin: string) => void;
  onBack?: () => void;
  isLoading?: boolean;
  error?: string | null;
}

export function PinEntryStep({ 
  workerId, 
  onSubmit, 
  onBack,
  isLoading = false, 
  error = null 
}: PinEntryStepProps) {
  const [pin, setPin] = useState('');

  const handleSubmit = () => {
    if (pin.length >= 4) {
      onSubmit(pin);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && pin.length >= 4) {
      handleSubmit();
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Lock className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">Welcome Back</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Enter PIN for <span className="font-medium text-foreground">{workerId}</span>
        </p>
      </div>

      {/* PIN input */}
      <div className="space-y-1.5">
        <Label htmlFor="pin" className="text-sm">Your PIN</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="pin"
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="Enter your 4-6 digit PIN"
            value={pin}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 6);
              setPin(value);
            }}
            onKeyDown={handleKeyDown}
            className="pl-10"
            disabled={isLoading}
            autoFocus
          />
        </div>
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>

      {/* Submit button */}
      <Button 
        onClick={handleSubmit} 
        className="w-full gap-2"
        disabled={isLoading || pin.length < 4}
      >
        {isLoading ? (
          'Verifying...'
        ) : (
          <>
            Continue
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </Button>

      {/* Back option */}
      {onBack && (
        <button
          onClick={onBack}
          className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
          disabled={isLoading}
        >
          Not {workerId}? Use a different ID
        </button>
      )}
    </div>
  );
}
