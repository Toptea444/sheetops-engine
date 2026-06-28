import { useState, useEffect } from 'react';
import { History, Search, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  Dialog,
  DialogOverlay,
  DialogPortal,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

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
 *
 * - Unclosable: no X button, backdrop click blocked, Escape blocked
 * - Success state shown for 2s before auto-closing after submission
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
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [shouldShow, setShouldShow] = useState(false);

  // 6-second delay before showing the modal
  useEffect(() => {
    if (open) {
      setShouldShow(false);
      const timer = setTimeout(() => {
        setShouldShow(true);
      }, 6000);
      return () => clearTimeout(timer);
    } else {
      setShouldShow(false);
    }
  }, [open]);

  const trimmed = value.trim().toUpperCase();
  const looksValid = /^[A-Za-z]{3,5}[-]?\d+$/.test(trimmed);
  const sameAsCurrent = trimmed && trimmed === currentUserId.toUpperCase();
  const canSubmit = looksValid && !sameAsCurrent;

  const handleSubmit = async () => {
    setTouched(true);
    if (!canSubmit || status !== 'idle') return;

    setStatus('loading');
    await new Promise((r) => setTimeout(r, 800));

    onSubmit(trimmed);
    setStatus('success');

    setTimeout(() => {
      setValue('');
      setTouched(false);
      setStatus('idle');
      onClose();
    }, 2200);
  };

  const handleSkip = () => {
    onSkip();
  };

  return (
    <Dialog open={open && shouldShow} onOpenChange={() => {/* intentionally blocked */}}>
      <DialogPortal>
        <DialogOverlay />
        {/* Use DialogPrimitive.Content directly so we control close behaviour */}
        <DialogPrimitive.Content
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          className={cn(
            'fixed left-[50%] top-[50%] z-50 grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]',
            'data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',
            'sm:rounded-lg',
          )}
        >
          {status === 'success' ? (
            /* ── Success state ── */
            <div className="flex flex-col items-center justify-center py-8 text-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-9 w-9 text-green-600" />
              </div>
              <div>
                <p className="text-lg font-semibold text-foreground">Got it!</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Fetching your previous earnings now…
                </p>
              </div>
            </div>
          ) : (
            /* ── Input state ── */
            <>
              <DialogHeader className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <History className="h-8 w-8 text-primary" />
                </div>
                <DialogTitle className="text-xl">Missing earnings from June 16 – 21?</DialogTitle>
                <DialogDescription className="text-base mt-2 leading-relaxed">
                  The management changed everyone's Worker ID on{' '}
                  <span className="font-semibold text-foreground">June 22, 2026</span>.
                  The sheet for June 16 – 21 still has your{' '}
                  <span className="font-semibold text-foreground">old ID</span>, so it can't
                  find you with your new one.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">
                  Type in your{' '}
                  <span className="font-semibold text-foreground">old Worker ID</span> below so the app can fetch your
              earnings for that period.
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Your former Worker ID</label>
                  <Input
                    autoFocus
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="e.g. NGDS2002"
                    className="uppercase"
                    disabled={status === 'loading'}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  />
                  {touched && !looksValid && value.length > 0 && (
                    <p className="text-xs text-destructive">That doesn't look like a Worker ID.</p>
                  )}
                  {sameAsCurrent && (
                    <p className="text-xs text-destructive">
                      That's your current ID — enter the old one.
                    </p>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  You only need to do this once. We'll remember it.
                </p>
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                <Button
                  variant="ghost"
                  onClick={handleSkip}
                  disabled={status === 'loading'}
                  className="text-muted-foreground text-xs"
                >
                  I don't have a former ID
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!canSubmit || status === 'loading'}
                  className="gap-2"
                >
                  {status === 'loading' ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4" />
                      Fetch my earnings
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
