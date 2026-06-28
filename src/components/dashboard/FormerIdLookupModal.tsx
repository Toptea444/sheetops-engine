import { useState } from 'react';
import { History, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface FormerIdLookupModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (formerId: string) => void;
  onSkip: () => void;
  currentUserId: string;
}

/**
 * Prompts users to enter their FORMER Worker ID so we can fetch their earnings
 * from sheets that were written before the global ID-format switch (June 22, 2026).
 */
export function FormerIdLookupModal({
  open,
  onClose,
  onSubmit,
  onSkip,
  currentUserId,
}: FormerIdLookupModalProps) {
  const [value, setValue] = useState('');
  const [touched, setTouched] = useState(false);

  const trimmed = value.trim().toUpperCase();
  const looksValid = /^[A-Za-z]{3,5}[-]?\d+$/.test(trimmed);
  const sameAsCurrent = trimmed && trimmed === currentUserId.toUpperCase();
  const canSubmit = looksValid && !sameAsCurrent;

  const handleSubmit = () => {
    setTouched(true);
    if (!canSubmit) return;
    onSubmit(trimmed);
    setValue('');
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <History className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-xl">Missing earnings from June 16 – 21?</DialogTitle>
          <DialogDescription className="text-base mt-2 leading-relaxed">
            We changed everyone's Worker ID on <span className="font-semibold text-foreground">June 22, 2026</span>.
            The sheet for June 16 – 21 still has your <span className="font-semibold text-foreground">old ID</span>,
            so it can't find you with your new one.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-4">
          <div className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">
            Type in your <span className="font-semibold text-foreground">old Worker ID</span> below and
            we'll pull those days in for you.
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Your former Worker ID</label>
            <Input
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="e.g. NGDS2002"
              className="uppercase"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
            {touched && !looksValid && (
              <p className="text-xs text-destructive">That doesn't look like a Worker ID.</p>
            )}
            {sameAsCurrent && (
              <p className="text-xs text-destructive">That's your current ID — enter the old one.</p>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            You only need to do this once. We'll remember it for the next time.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={onSkip} className="sm:mr-auto">
            Not now
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit} className="gap-2">
            <Search className="h-4 w-4" />
            Fetch my earnings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
