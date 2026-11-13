import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export interface CompletedSwap {
  oldId: string;
  newId: string;
  effectiveDate: string;
}

export function SwapCompleteModal({ swap, open, onClose }: { swap: CompletedSwap | null; open: boolean; onClose: () => void }) {
  if (!swap) return null;
  const date = new Date(`${swap.effectiveDate}T12:00:00`);
  const dateLabel = Number.isNaN(date.getTime()) ? swap.effectiveDate : date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-sm overflow-y-auto rounded-2xl sm:rounded-2xl">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-xl">ID change complete</DialogTitle>
          <DialogDescription className="mt-2 text-base">You’re now signed in with your new worker ID.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2 rounded-lg bg-muted/50 p-4 text-center">
            <p className="text-sm text-muted-foreground">Your new ID</p>
            <p className="break-words text-lg font-semibold text-foreground">{swap.newId}</p>
          </div>
          <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-foreground">
            <p className="font-medium">Your earnings history</p>
            <p className="text-muted-foreground">Before {dateLabel}, earnings are attributed to {swap.oldId}. From {dateLabel}, earnings are attributed to {swap.newId}.</p>
          </div>
        </div>
        <DialogFooter><Button onClick={onClose} className="w-full">Okay</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
