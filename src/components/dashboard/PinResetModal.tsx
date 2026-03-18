import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface PinResetModalProps {
  open: boolean;
  workerId: string;
  message?: string;
  onAcknowledge: () => void;
}

export function PinResetModal({
  open,
  workerId,
  message = 'Heads up — your admin reset your PIN. For security, please log in again with your worker ID and set up a new PIN.',
  onAcknowledge,
}: PinResetModalProps) {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-xl">PIN Reset Notice</DialogTitle>
          <DialogDescription className="text-base mt-2">{message}</DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="rounded-lg bg-muted/50 p-4 text-center space-y-2">
            <p className="text-sm text-muted-foreground">Affected Worker ID</p>
            <p className="text-lg font-semibold text-foreground">{workerId}</p>
          </div>

          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-foreground space-y-2">
            <p className="font-medium">What happens next:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Tap <span className="font-semibold text-foreground">Okay</span> below</li>
              <li>You will be returned to the start</li>
              <li>Enter your worker ID and continue</li>
            </ol>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onAcknowledge} className="w-full">
            Okay
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
