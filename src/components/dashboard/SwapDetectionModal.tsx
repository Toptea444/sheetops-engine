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
  /** True when the logged-in user's ID is being taken over by someone else */
  reassigned?: boolean;
  onLogout: () => void;
}

/**
 * Shown when a logged-in worker's ID has been swapped by admin.
 * Two variants:
 * 1. Default: User's old ID changed to new ID (they need to re-login with new ID)
 * 2. Reassigned: User's current ID was given to someone else (they need to contact management)
 */
export function SwapDetectionModal({ open, oldWorkerId, newWorkerId, reassigned, onLogout }: SwapDetectionModalProps) {
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
            {reassigned ? 'Your ID Has Been Reassigned' : 'Your ID Has Changed'}
          </DialogTitle>
          <DialogDescription className="text-base mt-2">
            {reassigned
              ? `Your worker ID (${newWorkerId}) has been reassigned to another worker by management. You may have been assigned a new ID.`
              : 'Your worker ID has been updated by management.'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {!reassigned && (
            <div className="rounded-lg bg-muted/50 p-4 text-center space-y-2">
              <p className="text-sm text-muted-foreground">Old ID</p>
              <p className="text-lg font-semibold text-muted-foreground line-through">{oldWorkerId}</p>
              <p className="text-sm text-muted-foreground mt-3">New ID</p>
              <p className="text-lg font-bold text-foreground">{newWorkerId}</p>
            </div>
          )}

          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-foreground space-y-2">
            <p className="font-medium">What you need to do:</p>
            {reassigned ? (
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Tap the button below to log out</li>
                <li>Contact your team lead for your new worker ID</li>
                <li>Log back in with your new ID once assigned</li>
              </ol>
            ) : (
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Tap the button below to log out</li>
                <li>Log back in using your <span className="font-semibold text-foreground">new ID: {newWorkerId}</span></li>
                <li>Set up a new PIN for your account</li>
              </ol>
            )}
          </div>

          <p className="text-xs text-muted-foreground text-center">
            {reassigned
              ? 'You have been logged out of this ID for security. Please contact management.'
              : 'All your earnings have been moved to your new ID. You\'ll see everything once you log in.'}
          </p>
        </div>

        <DialogFooter>
          <Button onClick={onLogout} className="w-full gap-2">
            <ArrowLeftRight className="h-4 w-4" />
            {reassigned ? 'Log out' : 'Log out & switch to new ID'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
