import { useState, useEffect } from 'react';
import { ShieldCheck, AlertTriangle, LogOut } from 'lucide-react';
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

type ConfirmStep = 'identity' | 'confirming';

interface IdentityConfirmationModalProps {
  open: boolean;
  userId: string;
  userName?: string | null;
  onConfirm: () => void;
  onDeny: () => void;
}

export function IdentityConfirmationModal({
  open,
  userId,
  userName,
  onConfirm,
  onDeny,
}: IdentityConfirmationModalProps) {
  const [showWarning, setShowWarning] = useState(false);
  const [step, setStep] = useState<ConfirmStep>('identity');
  const displayName = userName || userId;

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setStep('identity');
      setShowWarning(false);
    }
  }, [open]);

  const handleConfirmClick = () => {
    setShowWarning(true);
  };

  const handleFinalConfirm = () => {
    setShowWarning(false);
    setStep('confirming');
    // Directly confirm - PIN was already verified in WelcomeModal
    onConfirm();
  };

  const isIdentityStep = step === 'identity' && !showWarning;

  return (
    <>
      {/* Identity confirmation step */}
      <Dialog open={open && isIdentityStep} onOpenChange={() => {}}>
        <DialogContent 
          className="sm:max-w-md" 
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
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
              {userName && userName !== userId && (
                <p className="text-sm text-muted-foreground">{userId}</p>
              )}
            </div>
            
            <p className="mt-4 text-sm text-muted-foreground text-center">
              To prevent unauthorized access, please confirm this is your account.
            </p>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button 
              onClick={handleConfirmClick} 
              className="w-full gap-2"
            >
              <ShieldCheck className="h-4 w-4" />
              Yes, this is my account
            </Button>
            <Button 
              variant="outline"
              onClick={onDeny}
              className="w-full gap-2 text-destructive hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              No, log me out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Warning confirmation dialog */}
      <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-warning/20">
              <AlertTriangle className="h-6 w-6 text-warning" />
            </div>
            <AlertDialogTitle className="text-center">Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Once you confirm, <span className="font-semibold text-foreground">{displayName}</span> will be permanently linked to this device. 
              You won't be able to switch to a different account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <AlertDialogAction onClick={handleFinalConfirm} className="w-full">
              Yes, I confirm this is my account
            </AlertDialogAction>
            <AlertDialogCancel className="w-full">Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirming state */}
      <Dialog open={open && step === 'confirming'} onOpenChange={() => {}}>
        <DialogContent 
          className="sm:max-w-md" 
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <div className="py-8 text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
            <p className="text-muted-foreground">Securing your account...</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
