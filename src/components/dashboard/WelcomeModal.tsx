import { useState } from 'react';
import { User, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface WelcomeModalProps {
  open: boolean;
  onComplete: (userId: string) => void;
  isValidating?: boolean;
  validationError?: string | null;
  sessionLockError?: string | null;
}

export function WelcomeModal({ 
  open, 
  onComplete, 
  isValidating = false,
  validationError = null,
  sessionLockError = null,
}: WelcomeModalProps) {
  const [userId, setUserId] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // Show session lock error when it changes
  const displayError = error || validationError || sessionLockError;

  const validateAndSubmit = () => {
    const trimmedId = userId.trim().toUpperCase();
    
    if (!trimmedId) {
      setError('Please enter your Collector ID');
      return;
    }

    // Format: NGDS----, GHAS----, etc. (4 letters + alphanumeric)
    const pattern = /^[A-Z]{4}[A-Z0-9-]+$/;
    if (!pattern.test(trimmedId)) {
      setError('Invalid format. Expected format: NGDS0001 or GHAS-001');
      return;
    }

    setError(null);
    onComplete(trimmedId);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      validateAndSubmit();
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
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
                disabled={isValidating}
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
          disabled={isValidating}
        >
          {isValidating ? (
            'Validating...'
          ) : (
            <>
              Get Started
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
