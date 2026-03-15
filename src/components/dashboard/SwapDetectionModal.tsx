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
  /** The ID this user was logged in as (their previous/old ID) */
  yourPreviousId: string;
  /** The ID this user should now use (their new ID) */
  yourNewId: string;
  /** The other worker's ID they swapped with (for context) */
  swappedWithId: string;
  onLogout: () => void;
}

/**
 * Shown when a logged-in worker's ID has been swapped by admin.
 * For bidirectional swaps, both workers see the same consistent message format:
 * "You have been swapped with [other ID]. Your new ID is [new ID]."
 */
export function SwapDetectionModal({ 
  open, 
  yourPreviousId, 
  yourNewId, 
  swappedWithId, 
  onLogout 
}: SwapDetectionModalProps) {
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
          <DialogTitle className="text-xl">
            ID Swap Detected
          </DialogTitle>
          <DialogDescription className="text-base mt-2">
            You have been swapped with <span className="font-semibold">{swappedWithId}</span>. Your ID has changed.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="rounded-lg bg-muted/50 p-4 text-center space-y-2">
            <p className="text-sm text-muted-foreground">Your Old ID</p>
            <p className="text-lg font-semibold text-muted-foreground line-through">{yourPreviousId}</p>
            <p className="text-sm text-muted-foreground mt-3">Your New ID</p>
            <p className="text-lg font-bold text-foreground">{yourNewId}</p>
          </div>

          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-foreground space-y-2">
            <p className="font-medium">What you need to do:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Tap the button below to log out</li>
              <li>Log back in using your <span className="font-semibold text-foreground">new ID: {yourNewId}</span></li>
              <li>Set up a new PIN for your account</li>
            </ol>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Your earnings history will be preserved. Earnings before the swap date will show from your previous ID ({yourPreviousId}), and new earnings will be under your new ID ({yourNewId}).
          </p>
        </div>

        <DialogFooter>
          <Button onClick={onLogout} className="w-full gap-2">
            <ArrowLeftRight className="h-4 w-4" />
            Log out & switch to new ID
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
