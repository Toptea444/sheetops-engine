import { ArrowLeftRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function IdChangePrompt({ open, currentId, onStart, onNo, onLater }: {
  open: boolean;
  currentId: string;
  onStart: () => void;
  onNo: () => void;
  onLater: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onLater(); }}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-sm overflow-y-auto rounded-2xl sm:rounded-2xl">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <ArrowLeftRight className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-xl">Did your worker ID change?</DialogTitle>
          <DialogDescription className="mt-2 text-base">If you received a new ID, move your account so your earnings stay together.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2 text-sm">
          <div className="rounded-lg bg-muted/50 p-4 text-center">
            <p className="text-xs text-muted-foreground">Your current ID</p>
            <p className="mt-1 break-words font-semibold">{currentId}</p>
          </div>
          <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-4">
            <p className="font-medium">What happens next</p>
            <p className="text-muted-foreground">Enter your new ID and current PIN, then check the details before confirming. Your PIN stays the same.</p>
            <p className="text-muted-foreground">Earnings before November 10, 2026 use your old ID. Earnings from November 10 use your new ID.</p>
          </div>
          <p className="text-xs text-muted-foreground">Not ready? You can also update your ID later under Earnings settings.</p>
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
          <Button onClick={onStart} className="w-full">Yes, update my ID</Button>
          <Button variant="outline" onClick={onNo} className="w-full">No, my ID didn’t change</Button>
          <Button variant="ghost" onClick={onLater} className="w-full">Remind me later</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
