import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, BadgeDollarSign, CheckCircle2, Loader2, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getCycleKey } from '@/lib/cycleUtils';
import type { BonusResult, SheetData, WorkerData } from '@/types/bonus';
import type { CyclePeriod } from '@/lib/cycleUtils';

interface Props {
  open: boolean;
  onClose: () => void;
  userId: string | null;
  cycle: CyclePeriod;
  selectedSheets: string[];
  currentResults: BonusResult[];
  getSheetData: (sheetName: string) => Promise<SheetData | null>;
  searchWorker: (data: SheetData, workerId: string) => WorkerData | null;
  calculateBonus: (worker: WorkerData, startDate: Date, endDate: Date) => BonusResult;
  onSubmitted: () => void;
}

type Mode = 'deduct' | 'add';

type Preview = {
  amount: number;
  bonusAmount: number;
  rankingBonusAmount: number;
  sheetAmounts: Record<string, number>;
  sheetCount: number;
  otherWorkerName?: string;
};

const formatCurrency = (value: number) => `₦${Math.round(value).toLocaleString()}`;

const toDateKey = (ts?: number) => {
  if (ts === undefined) return '';
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const shortSheetName = (name: string) => {
  const upper = name.toUpperCase();
  if (upper.includes('DAILY') || upper.includes('PERFORMANCE')) return 'daily performance';
  if (upper.includes('RANKING')) return 'ranking bonus';
  return name;
};

function buildSheetText(sheetAmounts: Record<string, number>) {
  const entries = Object.entries(sheetAmounts).filter(([, amount]) => amount > 0);
  const labels = entries.map(([sheet, amount]) => `${formatCurrency(amount)} from ${shortSheetName(sheet)}`);
  if (labels.length <= 1) return labels[0] || '';
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]}`;
}

function collectDateAmounts(results: BonusResult[], date: string, selectedSheets: string[]): Preview {
  const sheetAmounts: Record<string, number> = {};
  let bonusAmount = 0;
  let rankingBonusAmount = 0;

  results.forEach((result) => {
    const sheetName = result.sheetName || '';
    if (!sheetName || !selectedSheets.includes(sheetName) || result.valueType === 'percent') return;

    const dayTotal = result.dailyBreakdown
      ?.filter((day) => toDateKey(day.fullDate) === date)
      .reduce((sum, day) => {
        bonusAmount += day.bonus ?? day.value ?? 0;
        rankingBonusAmount += day.rankingBonus ?? 0;
        return sum + (day.total ?? day.value ?? 0);
      }, 0) || 0;

    if (dayTotal > 0) sheetAmounts[sheetName] = (sheetAmounts[sheetName] || 0) + dayTotal;
  });

  return {
    amount: Object.values(sheetAmounts).reduce((sum, amount) => sum + amount, 0),
    bonusAmount,
    rankingBonusAmount,
    sheetAmounts,
    sheetCount: Object.keys(sheetAmounts).length,
  };
}

export function UserEarningsAdjustmentModal({
  open,
  onClose,
  userId,
  cycle,
  selectedSheets,
  currentResults,
  getSheetData,
  searchWorker,
  calculateBonus,
  onSubmitted,
}: Props) {
  const [mode, setMode] = useState<Mode>('deduct');
  const [date, setDate] = useState('');
  const [otherId, setOtherId] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const normalizedOtherId = otherId.trim().toUpperCase();
  const canPreview = Boolean(userId && date && (mode === 'deduct' || normalizedOtherId));
  const sheetText = useMemo(() => preview ? buildSheetText(preview.sheetAmounts) : '', [preview]);

  if (!open) return null;

  const resetAndClose = () => {
    setPreview(null);
    setConfirmed(false);
    setOtherId('');
    setDate('');
    setMode('deduct');
    onClose();
  };

  const handlePreview = async () => {
    if (!userId || !date) return;
    if (mode === 'add' && (!normalizedOtherId || normalizedOtherId === userId.toUpperCase())) {
      toast.error('Enter the ID you worked on. It must be different from your own ID.');
      return;
    }

    setIsPreviewing(true);
    setPreview(null);
    setConfirmed(false);

    try {
      const allTimeStart = new Date(2020, 0, 1);
      const endDate = new Date();
      const lookupId = mode === 'deduct' ? userId : normalizedOtherId;
      const lookupResults: BonusResult[] = [];
      let otherWorkerName = '';

      for (const sheetName of selectedSheets) {
        const data = await getSheetData(sheetName);
        if (!data) continue;
        const worker = searchWorker(data, lookupId);
        if (!worker) continue;
        if (mode === 'add' && !otherWorkerName && worker.userName) otherWorkerName = worker.userName;
        lookupResults.push({ ...calculateBonus(worker, allTimeStart, endDate), sheetName });
      }

      const sourceResults = lookupResults.length > 0 ? lookupResults : currentResults;
      const nextPreview = collectDateAmounts(sourceResults, date, selectedSheets);
      if (mode === 'deduct') {
        if (nextPreview.amount <= 0) {
          toast.error('No earnings were found for your ID on that date in the available sheets.');
          return;
        }
        setPreview(nextPreview);
        return;
      }

      if (nextPreview.amount <= 0) {
        toast.error(`No earnings were found for ${normalizedOtherId} on that date in the available sheets.`);
        return;
      }
      setPreview({ ...nextPreview, otherWorkerName });
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleSubmit = async () => {
    if (!userId || !preview || !date) return;
    if (mode === 'add' && !confirmed) {
      toast.error('Please tick the confirmation box first.');
      return;
    }

    setIsSubmitting(true);
    try {
      const note = mode === 'deduct'
        ? `You marked ${date} as a day you did not work. The system found ${sheetText}, so ${formatCurrency(preview.amount)} was deducted from your earnings for that date.`
        : `You said you worked on ${normalizedOtherId}${preview.otherWorkerName ? ` (${preview.otherWorkerName})` : ''} on ${date}. The system found ${sheetText}, so ${formatCurrency(preview.amount)} was added to your earnings. The same amount will show as a deduction on ${normalizedOtherId}'s earnings adjustments for that date.`;

      const { data, error } = await supabase.functions.invoke('user-earnings-adjustment', {
        body: {
          action: mode === 'deduct' ? 'deduct_unworked_day' : 'add_worked_id',
          worker_id: userId,
          other_worker_id: mode === 'add' ? normalizedOtherId : undefined,
          transfer_date: date,
          cycle_key: getCycleKey(cycle),
          amount: preview.amount,
          bonus_amount: preview.bonusAmount,
          ranking_bonus_amount: preview.rankingBonusAmount,
          sheet_amounts: preview.sheetAmounts,
          note,
        },
      });

      if (error || !data?.success) {
        toast.error(data?.error || error?.message || 'Could not save this adjustment.');
        return;
      }

      toast.success('Your earnings adjustment has been saved.');
      onSubmitted();
      resetAndClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={resetAndClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl">
        <button onClick={resetAndClose} className="absolute right-3 top-3 h-8 w-8 rounded-full hover:bg-muted/70 flex items-center justify-center" aria-label="Close">
          <X className="h-4 w-4 text-muted-foreground" />
        </button>

        <div className="flex items-start gap-3 pr-8">
          <div className="h-11 w-11 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <BadgeDollarSign className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Adjust your own earnings</h2>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Choose a date you did not work, or add earnings from another ID you worked on. The app will use the real sheet values for that date.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-5">
          <button onClick={() => { setMode('deduct'); setPreview(null); setConfirmed(false); }} className={`rounded-xl border p-3 text-left transition-colors ${mode === 'deduct' ? 'border-red-300 bg-red-50 dark:bg-red-950/25' : 'border-border bg-background/70 hover:bg-muted/50'}`}>
            <ArrowUpFromLine className="h-4 w-4 text-red-600 mb-2" />
            <p className="text-sm font-medium">Deduct</p>
            <p className="text-[11px] text-muted-foreground">I did not work that day.</p>
          </button>
          <button onClick={() => { setMode('add'); setPreview(null); setConfirmed(false); }} className={`rounded-xl border p-3 text-left transition-colors ${mode === 'add' ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/25' : 'border-border bg-background/70 hover:bg-muted/50'}`}>
            <ArrowDownToLine className="h-4 w-4 text-emerald-600 mb-2" />
            <p className="text-sm font-medium">Add</p>
            <p className="text-[11px] text-muted-foreground">I worked on another ID.</p>
          </button>
        </div>

        <div className="space-y-3 mt-4">
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Date</span>
            <input type="date" value={date} onChange={(e) => { setDate(e.target.value); setPreview(null); }} className="mt-1 w-full h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          </label>

          {mode === 'add' && (
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">ID you worked on</span>
              <input value={otherId} onChange={(e) => { setOtherId(e.target.value.toUpperCase()); setPreview(null); setConfirmed(false); }} placeholder="Example: K123" className="mt-1 w-full h-10 rounded-xl border border-border bg-background px-3 text-sm uppercase outline-none focus:ring-2 focus:ring-primary/30" />
            </label>
          )}
        </div>

        <button disabled={!canPreview || isPreviewing} onClick={handlePreview} className="mt-4 w-full h-11 rounded-2xl border border-border bg-background text-sm font-medium hover:bg-muted/60 disabled:opacity-50 flex items-center justify-center gap-2">
          {isPreviewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Check real sheet earnings
        </button>

        {preview && (
          <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-3">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-foreground">Found {formatCurrency(preview.amount)} from {preview.sheetCount} sheet{preview.sheetCount === 1 ? '' : 's'}.</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{sheetText}</p>
              </div>
            </div>

            {mode === 'add' && (
              <label className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
                <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5" />
                <span>
                  I understand that submitting this will add these earnings to me and deduct the same earnings from {normalizedOtherId}. The other account will see that I made this deduction in their earnings adjustment note.
                </span>
              </label>
            )}

            {mode === 'deduct' && (
              <div className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-900 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-100">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>This will deduct {formatCurrency(preview.amount)} from your total earnings and from the affected date in your earnings breakdown.</span>
              </div>
            )}
          </div>
        )}

        <button disabled={!preview || isSubmitting || (mode === 'add' && !confirmed)} onClick={handleSubmit} className="mt-4 w-full h-12 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Submit adjustment
        </button>
      </div>
    </div>
  );
}
