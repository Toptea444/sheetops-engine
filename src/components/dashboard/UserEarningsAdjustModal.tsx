import { useEffect, useMemo, useState, useCallback } from 'react';
import { CalendarX, UserPlus, Loader2, X, AlertTriangle, Check, RefreshCw, Calendar as CalendarIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useGoogleSheets } from '@/hooks/useGoogleSheets';
import { supabase } from '@/integrations/supabase/client';
import type { CyclePeriod } from '@/lib/cycleUtils';
import { getCycleKey, isDateInCycle } from '@/lib/cycleUtils';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
  workerId: string | null;
  cycle: CyclePeriod;
  availableSheetNames: string[];
  onChanged: () => void;
}

interface PerSheetMap { [sheetName: string]: number }

function toDateOnlyStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function shortLabel(name: string): string {
  const u = name.toUpperCase();
  if (u.includes('RANKING')) return 'Ranking bonus';
  if (u.includes('DAILY') || u.includes('PERFORMANCE')) return 'Daily performance';
  return name;
}

export function UserEarningsAdjustModal({
  open,
  onClose,
  workerId,
  cycle,
  availableSheetNames,
  onChanged,
}: Props) {
  const { fetchSheetData, searchWorker, calculateBonus } = useGoogleSheets();
  const [fadeIn, setFadeIn] = useState(false);
  const [tab, setTab] = useState<'deduct' | 'add'>('deduct');

  // Shared
  const cycleKey = useMemo(() => getCycleKey(cycle), [cycle]);
  const today = toDateOnlyStr(new Date());
  const minDate = toDateOnlyStr(cycle.startDate);
  const maxDate = today < toDateOnlyStr(cycle.endDate) ? today : toDateOnlyStr(cycle.endDate);

  // Deduct state
  const [dDate, setDDate] = useState('');
  const [dAmounts, setDAmounts] = useState<PerSheetMap>({});
  const [dFetched, setDFetched] = useState(false);
  const [dFetching, setDFetching] = useState(false);
  const [dSubmitting, setDSubmitting] = useState(false);

  // Add state
  const [aPrefix, setAPrefix] = useState('NGDS');
  const [aId, setAId] = useState('');
  const [aDate, setADate] = useState('');
  const [aAmounts, setAAmounts] = useState<PerSheetMap>({});
  const [aFetched, setAFetched] = useState(false);
  const [aFetching, setAFetching] = useState(false);
  const [aSubmitting, setASubmitting] = useState(false);
  const [aConfirming, setAConfirming] = useState(false);

  // My adjustments list
  const [myAdjustments, setMyAdjustments] = useState<any[]>([]);
  const [loadingMine, setLoadingMine] = useState(false);
  const [showHistory, setShowHistory] = useState(false);


  useEffect(() => {
    if (!open) {
      setFadeIn(false);
      return;
    }
    requestAnimationFrame(() => requestAnimationFrame(() => setFadeIn(true)));
  }, [open]);

  const close = useCallback(() => {
    setFadeIn(false);
    setTimeout(onClose, 250);
  }, [onClose]);

  const loadMine = useCallback(async () => {
    if (!workerId) return;
    setLoadingMine(true);
    try {
      const { data, error } = await supabase.functions.invoke('user-earnings-adjust', {
        body: { action: 'list_my_adjustments', worker_id: workerId, params: { cycle_key: cycleKey } },
      });
      if (error || data?.success === false) {
        toast.error(data?.error || 'Failed to load your adjustments');
      } else {
        setMyAdjustments(data?.adjustments || []);
      }
    } finally {
      setLoadingMine(false);
    }
  }, [workerId, cycleKey]);

  useEffect(() => {
    if (open) loadMine();
  }, [open, loadMine]);

  // ── Deduct: fetch earnings for self on a date across all sheets in cycle ──
  const fetchDeductionEarnings = useCallback(async () => {
    if (!workerId || !dDate) {
      toast.error('Pick a date first');
      return;
    }
    setDFetching(true);
    const map: PerSheetMap = {};
    try {
      const dateObj = new Date(dDate + 'T12:00:00');
      if (!isDateInCycle(dateObj, cycle)) {
        toast.error('That date is outside this cycle');
        setDFetching(false);
        return;
      }
      for (const name of availableSheetNames) {
        const data = await fetchSheetData(name);
        if (!data) continue;
        const w = searchWorker(data, workerId);
        if (!w) continue;
        const result = calculateBonus(w, dateObj, dateObj);
        const amt = result?.dailyBreakdown.reduce((s, d) => s + (d.value || 0), 0) || 0;
        if (amt > 0) map[name] = amt;
      }
      setDAmounts(map);
      setDFetched(true);
      const total = Object.values(map).reduce((s, v) => s + v, 0);
      if (total === 0) toast.warning('No earnings found for you on that date');
      else toast.success(`Found ₦${total.toLocaleString()} to remove`);
    } catch {
      toast.error('Failed to fetch earnings');
    } finally {
      setDFetching(false);
    }
  }, [workerId, dDate, cycle, availableSheetNames, fetchSheetData, searchWorker, calculateBonus]);

  const submitDeduction = useCallback(async () => {
    if (!workerId || !dDate) return;
    const total = Object.values(dAmounts).reduce((s, v) => s + v, 0);
    if (total <= 0) {
      toast.error('Nothing to deduct');
      return;
    }
    setDSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('user-earnings-adjust', {
        body: {
          action: 'create_deduction',
          worker_id: workerId,
          params: { date: dDate, cycle_key: cycleKey, sheet_amounts: dAmounts },
        },
      });
      if (error || data?.success === false) {
        toast.error(data?.error || 'Could not save deduction');
      } else {
        toast.success('Day marked as not worked — your earnings have been updated');
        setDDate('');
        setDAmounts({});
        setDFetched(false);
        await loadMine();
        onChanged();
      }
    } finally {
      setDSubmitting(false);
    }
  }, [workerId, dDate, dAmounts, cycleKey, loadMine, onChanged]);

  // ── Add: fetch earnings for OTHER id on a date ──
  const fullSourceId = `${aPrefix}${aId.trim()}`.toUpperCase();

  const fetchAdditionEarnings = useCallback(async () => {
    if (!aId.trim() || !aDate) {
      toast.error('Enter the ID and pick a date');
      return;
    }
    if (fullSourceId === workerId?.toUpperCase()) {
      toast.error('You cannot add earnings from your own ID');
      return;
    }
    setAFetching(true);
    const map: PerSheetMap = {};
    try {
      const dateObj = new Date(aDate + 'T12:00:00');
      if (!isDateInCycle(dateObj, cycle)) {
        toast.error('That date is outside this cycle');
        setAFetching(false);
        return;
      }
      for (const name of availableSheetNames) {
        const data = await fetchSheetData(name);
        if (!data) continue;
        const w = searchWorker(data, fullSourceId);
        if (!w) continue;
        const result = calculateBonus(w, dateObj, dateObj);
        const amt = result?.dailyBreakdown.reduce((s, d) => s + (d.value || 0), 0) || 0;
        if (amt > 0) map[name] = amt;
      }
      setAAmounts(map);
      setAFetched(true);
      const total = Object.values(map).reduce((s, v) => s + v, 0);
      if (total === 0) toast.warning(`No earnings found for ${fullSourceId} on that date`);
      else toast.success(`Found ₦${total.toLocaleString()} from ${fullSourceId}`);
    } catch {
      toast.error('Failed to fetch earnings');
    } finally {
      setAFetching(false);
    }
  }, [aId, aDate, fullSourceId, workerId, cycle, availableSheetNames, fetchSheetData, searchWorker, calculateBonus]);

  const submitAddition = useCallback(async () => {
    if (!workerId || !aDate || !aId.trim()) return;
    const total = Object.values(aAmounts).reduce((s, v) => s + v, 0);
    if (total <= 0) {
      toast.error('Nothing to add');
      return;
    }
    setASubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('user-earnings-adjust', {
        body: {
          action: 'create_addition',
          worker_id: workerId,
          params: {
            source_worker_id: fullSourceId,
            date: aDate,
            cycle_key: cycleKey,
            sheet_amounts: aAmounts,
          },
        },
      });
      if (error || data?.success === false) {
        toast.error(data?.error || 'Could not add earnings');
      } else {
        toast.success(`Added ₦${total.toLocaleString()} from ${fullSourceId} to your earnings`);
        setAId('');
        setADate('');
        setAAmounts({});
        setAFetched(false);
        setAConfirming(false);
        await loadMine();
        onChanged();
      }
    } finally {
      setASubmitting(false);
    }
  }, [workerId, aDate, aId, aAmounts, fullSourceId, cycleKey, loadMine, onChanged]);

  // (Users cannot delete their own adjustments — admin is the only one who can undo them.)


  if (!open) return null;

  const dTotal = Object.values(dAmounts).reduce((s, v) => s + v, 0);
  const aTotal = Object.values(aAmounts).reduce((s, v) => s + v, 0);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-250"
        style={{ opacity: fadeIn ? 1 : 0 }}
        onClick={close}
      />
      <div
        className="relative w-full max-w-md rounded-2xl border border-border bg-card shadow-xl transition-all duration-250 ease-out max-h-[90vh] flex flex-col"
        style={{
          opacity: fadeIn ? 1 : 0,
          transform: fadeIn ? 'scale(1) translateY(0)' : 'scale(0.97) translateY(8px)',
        }}
      >
        <div className="flex items-center justify-between p-5 pb-3 border-b border-border/60">
          <div>
            <h2 className="text-base font-semibold text-foreground">Your earnings adjustments</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Mark a day off or claim a day you worked.</p>
          </div>
          <button onClick={close} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 pt-4 space-y-4">
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList className="grid w-full grid-cols-2 h-9">
              <TabsTrigger value="deduct" className="text-xs gap-1">
                <CalendarX className="h-3 w-3" /> Day off
              </TabsTrigger>
              <TabsTrigger value="add" className="text-xs gap-1">
                <UserPlus className="h-3 w-3" /> Add day worked
              </TabsTrigger>
            </TabsList>

            <TabsContent value="deduct" className="space-y-3 mt-4">
              <div className="flex gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                  Pick a date you didn't work. We'll fetch your actual earnings for that day across all sheets and remove them from your totals.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Date you didn't work</Label>
                <Input
                  type="date"
                  value={dDate}
                  min={minDate}
                  max={maxDate}
                  onChange={(e) => { setDDate(e.target.value); setDFetched(false); setDAmounts({}); }}
                  className="text-sm h-9 [&::-webkit-calendar-picker-indicator]:opacity-50"
                />
              </div>

              <Button variant="outline" onClick={fetchDeductionEarnings} disabled={!dDate || dFetching} className="w-full h-9 text-xs">
                {dFetching ? <Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1.5" />}
                {dFetched ? 'Re-fetch from sheets' : 'Fetch my earnings for this date'}
              </Button>

              {dFetched && (
                <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
                  {Object.keys(dAmounts).length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-2">No earnings recorded for you on this date.</p>
                  ) : (
                    <>
                      {Object.entries(dAmounts).map(([name, val]) => (
                        <div key={name} className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{shortLabel(name)}</span>
                          <span className="font-mono font-medium text-destructive">-₦{val.toLocaleString()}</span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between pt-2 border-t border-border/60">
                        <span className="text-xs font-medium">Will be removed</span>
                        <span className="text-sm font-bold text-destructive">-₦{dTotal.toLocaleString()}</span>
                      </div>
                    </>
                  )}
                </div>
              )}

              <Button onClick={submitDeduction} disabled={!dFetched || dTotal <= 0 || dSubmitting} className="w-full">
                {dSubmitting ? <Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> : <Check className="h-3 w-3 mr-1.5" />}
                Mark day as not worked
              </Button>
            </TabsContent>

            <TabsContent value="add" className="space-y-3 mt-4">
              <div className="flex gap-2 p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                <AlertTriangle className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-blue-800 dark:text-blue-300 leading-relaxed">
                  Enter the ID you worked on and the date. We'll pull that ID's earnings for that day, add it to you and remove it from them.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">ID you worked on</Label>
                <div className="flex">
                  <Input value={aPrefix} onChange={(e) => { setAPrefix(e.target.value.toUpperCase()); setAFetched(false); }}
                    className="text-xs font-mono w-20 rounded-r-none border-r-0 bg-muted/50 px-2 h-9" />
                  <Input placeholder="1001" value={aId} onChange={(e) => { setAId(e.target.value); setAFetched(false); }}
                    className="text-sm font-mono rounded-l-none h-9" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Date you worked</Label>
                <Input
                  type="date"
                  value={aDate}
                  min={minDate}
                  max={maxDate}
                  onChange={(e) => { setADate(e.target.value); setAFetched(false); setAAmounts({}); }}
                  className="text-sm h-9 [&::-webkit-calendar-picker-indicator]:opacity-50"
                />
              </div>

              <Button variant="outline" onClick={fetchAdditionEarnings} disabled={!aId.trim() || !aDate || aFetching} className="w-full h-9 text-xs">
                {aFetching ? <Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1.5" />}
                {aFetched ? 'Re-fetch from sheets' : `Fetch ${aId.trim() ? fullSourceId : 'ID'}'s earnings`}
              </Button>

              {aFetched && (
                <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
                  {Object.keys(aAmounts).length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-2">No earnings found for {fullSourceId} on this date.</p>
                  ) : (
                    <>
                      {Object.entries(aAmounts).map(([name, val]) => (
                        <div key={name} className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{shortLabel(name)}</span>
                          <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">+₦{val.toLocaleString()}</span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between pt-2 border-t border-border/60">
                        <span className="text-xs font-medium">Will be added to you</span>
                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">+₦{aTotal.toLocaleString()}</span>
                      </div>
                    </>
                  )}
                </div>
              )}

              <Button
                onClick={() => setAConfirming(true)}
                disabled={!aFetched || aTotal <= 0 || aSubmitting}
                className="w-full"
              >
                {aSubmitting ? <Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> : <Check className="h-3 w-3 mr-1.5" />}
                Add to my earnings
              </Button>
            </TabsContent>
          </Tabs>

          {/* My adjustments history */}
          <div className="pt-2 border-t border-border/60">
            <button
              onClick={() => setShowHistory((v) => !v)}
              className="w-full flex items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground py-1.5"
            >
              <span className="flex items-center gap-1.5">
                <CalendarIcon className="h-3 w-3" />
                Your adjustments this cycle ({myAdjustments.length})
              </span>
              {showHistory ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            {showHistory && (
              <div className="mt-2 space-y-2 max-h-[200px] overflow-y-auto">
                {loadingMine ? (
                  <p className="text-xs text-muted-foreground text-center py-3">Loading…</p>
                ) : myAdjustments.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-3">No adjustments yet</p>
                ) : myAdjustments.map(adj => {
                  const isAddition = adj.kind === 'user_addition';
                  const dateLabel = new Date(adj.transfer_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  return (
                    <div key={adj.id} className="rounded-lg border border-border p-2.5 flex items-start gap-2">
                      <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${
                        isAddition ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-red-50 dark:bg-red-950/30'
                      }`}>
                        {isAddition ? <UserPlus className="h-3 w-3 text-emerald-600 dark:text-emerald-400" /> : <CalendarX className="h-3 w-3 text-red-600 dark:text-red-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant="outline" className="text-[9px] h-4">{isAddition ? 'Added' : 'Day off'}</Badge>
                          <span className="text-[11px] font-medium">{dateLabel}</span>
                          <span className={`text-[11px] font-mono font-semibold ${isAddition ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                            {isAddition ? '+' : '-'}₦{Number(adj.amount).toLocaleString()}
                          </span>
                        </div>
                        {isAddition && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">From {adj.source_worker_id}</p>
                        )}
                      </div>
                      <button onClick={() => setDeleteId(adj.id)} className="text-muted-foreground hover:text-destructive shrink-0">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation for addition */}
      <AlertDialog open={aConfirming} onOpenChange={(o) => !o && setAConfirming(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              You're about to claim <strong>{new Date((aDate || today) + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</strong> from <strong>{fullSourceId}</strong>.
              <br /><br />
              ₦{aTotal.toLocaleString()} will be added to your earnings. The same amount will be <strong>removed from {fullSourceId}'s account</strong>, and they will see a note that you did this.
              <br /><br />
              Please make sure this is correct — only do this if you actually worked that day for them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={aSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={submitAddition} disabled={aSubmitting}>
              {aSubmitting ? <Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> : null}
              Yes, add it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this adjustment?</AlertDialogTitle>
            <AlertDialogDescription>
              Your earnings will go back to what the sheets show. If this was an addition from another ID, the other person also gets their earnings back.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
