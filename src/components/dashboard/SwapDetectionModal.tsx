import { ArrowLeftRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface SwapDetectionModalProps {
  open: boolean;
  oldWorkerId: string;
  newWorkerId: string;
  effectiveDate?: string;
  onLogout: () => void;
}

/**
 * Shown when a logged-in worker is part of an admin-created ID swap.
 * The message is intentionally symmetric so both swap participants
 * see the same details and next steps.
 */
export function SwapDetectionModal({ open, oldWorkerId, newWorkerId, effectiveDate, onLogout }: SwapDetectionModalProps) {
  const effectiveDateLabel = effectiveDate
    ? new Date(`${effectiveDate}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <ArrowLeftRight className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-xl">Worker ID Swap Detected</DialogTitle>
          <DialogDescription className="text-base mt-2">
            Your account was swapped by management. Both workers were logged out for security.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="rounded-lg bg-muted/50 p-4 text-center space-y-2">
            <p className="text-sm text-muted-foreground">Swap pair</p>
            <p className="text-lg font-semibold text-foreground">{oldWorkerId} ↔ {newWorkerId}</p>
            {effectiveDateLabel && (
              <p className="text-xs text-muted-foreground">Effective date: {effectiveDateLabel}</p>
            )}
          </div>

          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-foreground space-y-2">
            <p className="font-medium">What you need to do:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Tap the button below to log out</li>
              <li>Log back in with the worker ID assigned to you after this swap</li>
              <li>Set up a new PIN for your account</li>
            </ol>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Earnings before the swap date come from the previous assigned ID. Earnings from the swap date onward come from your current assigned ID.
          </p>
        </div>

        <DialogFooter>
          <Button onClick={onLogout} className="w-full gap-2">
            <ArrowLeftRight className="h-4 w-4" />
            Log out & continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
