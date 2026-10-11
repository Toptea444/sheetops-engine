import { useEffect, useState } from 'react';
import { ArrowRight, Loader2, AlertTriangle, ArrowLeftRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { getCycleKey, getCycleOptions } from '@/lib/cycleUtils';
import { toast } from 'sonner';

interface SwapAccountModalProps {
  open: boolean;
  onClose: () => void;
  currentId: string | null;
  /** Checks that the ID exists on the sheets; returns the name found there. */
  onValidateId: (id: string) => Promise<{ valid: boolean; userName?: string }>;
  onSwapped: (args: { newId: string; userName?: string; swapId: string }) => void;
}

const toLocal = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const prettyDate = (s: string) =>
  new Date(s + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

export function SwapAccountModal({ open, onClose, currentId, onValidateId, onSwapped }: SwapAccountModalProps) {
  const today = toLocal(new Date());
  const minDate = toLocal(new Date(Date.now() - 60 * 86400_000));

  const [step, setStep] = useState<'form' | 'confirm'>('form');
  const [newId, setNewId] = useState('');
  const [date, setDate] = useState(today);
  const [pin, setPin] = useState('');
  const [note, setNote] = useState('');
  const [foundName, setFoundName] = useState<string | undefined>();
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setStep('form'); setNewId(''); setDate(today); setPin(''); setNote('');
      setFoundName(undefined); setError(null);
    }
  }, [open, today]);

  const cleanNew = newId.trim().toUpperCase();
  const fromId = (currentId || '').toUpperCase();

  const handleContinue = async () => {
    setError(null);
    if (!cleanNew) return setError('Type your new ID.');
    if (cleanNew === fromId) return setError("That's the ID you're already using.");
    if (!date || date > today) return setError('Pick a date that is today or before.');
    if (date < minDate) return setError('That date is too far back. Please message admin for older changes.');
    if (!/^\d{4,6}$/.test(pin)) return setError('Type your PIN.');
    setChecking(true);
    try {
      const res = await onValidateId(cleanNew);
      if (!res.valid) {
        setError(`We couldn't find ${cleanNew} on the sheets yet. Check the ID, or wait until it shows on the sheet.`);
        return;
      }
      setFoundName(res.userName && res.userName !== cleanNew ? res.userName : undefined);
      setStep('confirm');
    } finally {
      setChecking(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const cycleKey = getCycleKey(getCycleOptions(0)[0]);
      const { data, error: fnError } = await supabase.functions.invoke('user-swap-id', {
        body: { worker_id: fromId, new_worker_id: cleanNew, pin, effective_date: date, cycle_key: cycleKey, note },
      });
      if (fnError || !data?.success) {
        setError(data?.error || 'Something went wrong. Please try again.');
        setStep('form');
        return;
      }
      toast.success(`Done! You're now on ${cleanNew}. Your PIN stays the same.`);
      onSwapped({ newId: cleanNew, userName: foundName, swapId: data.swap.id });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !submitting && onClose()}>
      <DialogContent className="max-w-[92vw] sm:max-w-md z-[110]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4 text-primary" />
            Swap your account
          </DialogTitle>
          <DialogDescription>
            Did your TL give you a new ID? Move your account to it here. Your earnings from your old ID stay with you.
          </DialogDescription>
        </DialogHeader>

        {step === 'form' ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Your ID right now</Label>
              <div className="h-10 rounded-md border border-border bg-muted/40 px-3 flex items-center text-sm font-medium tabular-nums">
                {fromId || '—'}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="swap-new-id">Your new ID</Label>
              <Input
                id="swap-new-id"
                placeholder="NGDS"
                value={newId}
                autoCapitalize="characters"
                autoComplete="off"
                onChange={(e) => setNewId(e.target.value.toUpperCase())}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="swap-date">When did you start using the new ID?</Label>
              <Input id="swap-date" type="date" min={minDate} max={today} value={date} onChange={(e) => setDate(e.target.value)} />
              <p className="text-xs text-muted-foreground">
                Days before this date will come from {fromId || 'your old ID'}. From this date, they come from your new ID.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="swap-pin">Your PIN</Label>
              <Input
                id="swap-pin"
                type="password"
                inputMode="numeric"
                maxLength={6}
                placeholder="Same PIN you use to log in"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="swap-note" className="text-muted-foreground">Note (optional)</Label>
              <Textarea id="swap-note" rows={2} placeholder="e.g. TL changed my ID" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              <Button onClick={handleContinue} disabled={checking}>
                {checking && <Loader2 className="h-4 w-4 animate-spin" />}
                Continue
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <div className="flex items-center justify-center gap-3 text-sm font-semibold tabular-nums">
                <span className="text-muted-foreground">{fromId}</span>
                <ArrowRight className="h-4 w-4 text-primary" />
                <span className="text-foreground">{cleanNew}</span>
              </div>
              {foundName && <p className="text-xs text-center text-muted-foreground mt-1">Name on sheet: {foundName}</p>}
              <p className="text-xs text-center text-muted-foreground mt-2">Starting {prettyDate(date)}</p>
            </div>

            <div className="flex gap-2 rounded-lg border border-amber-300/60 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800/60 p-3 text-sm text-amber-800 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium">Please check well before you confirm.</p>
                <p className="text-xs">You can only undo this by messaging admin. After this, you'll log in with {cleanNew} and the same PIN.</p>
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setStep('form')} disabled={submitting}>Go back</Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Yes, swap my account
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
