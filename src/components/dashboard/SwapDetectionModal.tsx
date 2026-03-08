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
  onLogout: () => void;
}

/**
 * Shown when a logged-in worker's ID has been swapped by admin.
 * Forces them to log out and re-login with their new ID.
 */
export function SwapDetectionModal({ open, oldWorkerId, newWorkerId, onLogout }: SwapDetectionModalProps) {
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
          <DialogTitle className="text-xl">Your ID Has Changed</DialogTitle>
          <DialogDescription className="text-base mt-2">
            Your worker ID has been updated by management.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="rounded-lg bg-muted/50 p-4 text-center space-y-2">
            <p className="text-sm text-muted-foreground">Old ID</p>
            <p className="text-lg font-semibold text-muted-foreground line-through">{oldWorkerId}</p>
            <p className="text-sm text-muted-foreground mt-3">New ID</p>
            <p className="text-lg font-bold text-foreground">{newWorkerId}</p>
          </div>

          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-foreground space-y-2">
            <p className="font-medium">What you need to do:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Tap the button below to log out</li>
              <li>Log back in using your <span className="font-semibold text-foreground">new ID: {newWorkerId}</span></li>
              <li>Set up a new PIN for your account</li>
            </ol>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            All your earnings have been moved to your new ID. You'll see everything once you log in.
          </p>
        </div>

        <DialogFooter>
          <Button onClick={onLogout} className="w-full gap-2">
            <ArrowLeftRight className="h-4 w-4" />
            Log out &amp; switch to new ID
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
