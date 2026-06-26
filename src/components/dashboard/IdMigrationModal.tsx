import { KeyRound, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface IdMigrationModalProps {
  open: boolean;
  currentUserId: string;
  onLogout: () => void;
}

/**
 * Shown once after a global Worker ID format change.
 * Forces every existing user to log out and re-login with their new ID
 * (which will trigger a fresh PIN setup since no PIN exists for the new ID).
 */
export function IdMigrationModal({ open, currentUserId, onLogout }: IdMigrationModalProps) {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <KeyRound className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-xl">Worker IDs Have Changed</DialogTitle>
          <DialogDescription className="text-base mt-2">
            Management has updated everyone's Worker ID to a new format. You'll need to log in again using your new ID.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-4">
          {currentUserId && (
            <div className="rounded-lg bg-muted/50 p-4 text-center space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Currently logged in as</p>
              <p className="text-lg font-semibold text-muted-foreground line-through">{currentUserId}</p>
            </div>
          )}

          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-foreground space-y-2">
            <p className="font-medium">What you need to do:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Tap the button below to log out</li>
              <li>Log back in using your <span className="font-semibold text-foreground">new Worker ID</span></li>
              <li>Set up a new PIN for your account</li>
            </ol>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Your previous cycles will remain visible under your old ID. New earnings will be tracked under your new ID going forward.
          </p>
        </div>

        <DialogFooter>
          <Button onClick={onLogout} className="w-full gap-2">
            <LogOut className="h-4 w-4" />
            Log out & continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
