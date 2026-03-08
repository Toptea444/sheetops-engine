import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  ArrowLeftRight, Plus, Trash2, RefreshCw, Calendar, ChevronDown,
  ArrowRight, FileText, X, CheckIcon, AlertTriangle, Check, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAdminData } from '@/hooks/useAdminData';
import { getCycleOptions, getCycleKey } from '@/lib/cycleUtils';
import { useGoogleSheets } from '@/hooks/useGoogleSheets';
import { toast } from 'sonner';

interface Props {
  adminSecret: string;
}

export function SwapsTransfersTab({ adminSecret }: Props) {
  return (
    <Tabs defaultValue="swaps" className="space-y-4">
      <TabsList className="grid w-full grid-cols-2 h-9">
        <TabsTrigger value="swaps" className="text-xs gap-1">
          <ArrowLeftRight className="h-3 w-3" />ID Swaps
        </TabsTrigger>
        <TabsTrigger value="transfers" className="text-xs gap-1">
          <ArrowRight className="h-3 w-3" />Day Transfers
        </TabsTrigger>
      </TabsList>
      <TabsContent value="swaps"><SwapsSection adminSecret={adminSecret} /></TabsContent>
      <TabsContent value="transfers"><TransfersSection adminSecret={adminSecret} /></TabsContent>
    </Tabs>
  );
}

// ─── Swaps Section ───────────────────────────────────────────
function SwapsSection({ adminSecret }: Props) {
  const { adminRequest, isLoading } = useAdminData();
  const [swaps, setSwaps] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ worker_name: '', old_worker_id: '', new_worker_id: '', effective_date: '', notes: '' });
  const [creating, setCreating] = useState(false);

  const cycleOptions = useMemo(() => getCycleOptions(6), []);
  const [selectedCycleIdx, setSelectedCycleIdx] = useState(0);
  const selectedCycleKey = getCycleKey(cycleOptions[selectedCycleIdx]);
  const [showCycleDropdown, setShowCycleDropdown] = useState(false);

  const load = useCallback(async () => {
    const res = await adminRequest(adminSecret, 'get_swaps', { cycle_key: selectedCycleKey });
    if (res?.swaps) setSwaps(res.swaps);
  }, [adminRequest, adminSecret, selectedCycleKey]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.worker_name.trim() || !form.old_worker_id.trim() || !form.new_worker_id.trim() || !form.effective_date) {
      toast.error('Worker name, old ID, new ID, and effective date are required');
      return;
    }
    setCreating(true);
    const res = await adminRequest(adminSecret, 'create_swap', {
      ...form,
      cycle_key: selectedCycleKey,
    });
    if (res?.success) {
      toast.success('ID Swap recorded');
      setForm({ worker_name: '', old_worker_id: '', new_worker_id: '', effective_date: '', notes: '' });
      setShowForm(false);
      load();
    } else {
      toast.error(res?.error || 'Failed to create swap');
    }
    setCreating(false);
  };

  const handleDelete = async (id: string) => {
    const res = await adminRequest(adminSecret, 'delete_swap', { swap_id: id });
    if (res?.success) {
      toast.success('Swap deleted');
      load();
    } else {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="space-y-4">
      {/* Info */}
      <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-3 px-4 pb-3">
          <div className="flex gap-2">
            <AlertTriangle className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-800 dark:text-blue-300 space-y-1">
              <p className="font-medium">When to use ID Swaps:</p>
              <p>When a worker is permanently reassigned to a different ID mid-cycle. This tells the app to show earnings from their old ID (before the swap date) and new ID (from the swap date) together, while hiding the previous owner's data.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cycle filter */}
      <div className="relative">
        <Button variant="outline" size="sm" className="w-full justify-between text-xs"
          onClick={() => setShowCycleDropdown(!showCycleDropdown)}>
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            <span>{cycleOptions[selectedCycleIdx].label}</span>
          </div>
          <ChevronDown className={`h-3 w-3 ml-1 opacity-50 transition-transform ${showCycleDropdown ? 'rotate-180' : ''}`} />
        </Button>
        {showCycleDropdown && (
          <Card className="absolute top-full left-0 right-0 mt-1 z-50 shadow-lg">
            <div className="py-1 max-h-[200px] overflow-y-auto">
              {cycleOptions.map((c, idx) => (
                <button key={getCycleKey(c)} onClick={() => { setSelectedCycleIdx(idx); setShowCycleDropdown(false); }}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-muted/50 ${selectedCycleIdx === idx ? 'bg-accent font-medium' : ''}`}>
                  {c.label} {idx === 0 && <Badge variant="secondary" className="text-[9px] h-4 ml-1">Current</Badge>}
                </button>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Create form */}
      {!showForm ? (
        <Button onClick={() => setShowForm(true)} className="w-full">
          <Plus className="h-4 w-4 mr-2" />Record ID Swap
        </Button>
      ) : (
        <Card className="bg-muted/30">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Record ID Swap</span>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </CardTitle>
            <CardDescription className="text-xs">Record when a worker is permanently moved to a different ID</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Worker Name</Label>
              <Input placeholder="e.g. John Doe" value={form.worker_name}
                onChange={e => setForm({ ...form, worker_name: e.target.value })} className="text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Old Worker ID</Label>
                <Input placeholder="e.g. NGDS2002" value={form.old_worker_id}
                  onChange={e => setForm({ ...form, old_worker_id: e.target.value })} className="text-sm font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">New Worker ID</Label>
                <Input placeholder="e.g. NGDS1001" value={form.new_worker_id}
                  onChange={e => setForm({ ...form, new_worker_id: e.target.value })} className="text-sm font-mono" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Effective Date (swap happened on this date)</Label>
              <Input type="date" value={form.effective_date}
                onChange={e => setForm({ ...form, effective_date: e.target.value })} className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notes (optional)</Label>
              <Textarea placeholder="Reason for swap..." value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })} className="min-h-[50px] text-sm" />
            </div>
            <Button onClick={handleCreate} disabled={creating} className="w-full">
              {creating ? <RefreshCw className="h-3 w-3 mr-2 animate-spin" /> : <CheckIcon className="h-3 w-3 mr-2" />}
              Record Swap
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Swaps list */}
      <ScrollArea className="h-[350px]">
        <div className="space-y-2">
          {swaps.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No ID swaps recorded for this cycle</p>
          ) : swaps.map(s => (
            <Card key={s.id} className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant="secondary" className="text-[10px] font-mono">{s.old_worker_id}</Badge>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <Badge variant="secondary" className="text-[10px] font-mono">{s.new_worker_id}</Badge>
                  </div>
                  <p className="text-sm font-medium">{s.worker_name}</p>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-0.5"><Calendar className="h-2.5 w-2.5" />Effective: {new Date(s.effective_date).toLocaleDateString()}</span>
                    <span>Recorded: {new Date(s.created_at).toLocaleString()}</span>
                  </div>
                  {s.notes && <p className="text-[11px] text-muted-foreground italic">{s.notes}</p>}
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-destructive hover:text-destructive shrink-0"
                  onClick={() => handleDelete(s.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>

      <Button variant="outline" size="sm" onClick={load} disabled={isLoading}>
        <RefreshCw className={`h-3 w-3 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />Refresh
      </Button>
    </div>
  );
}

// ─── Transfers Section ───────────────────────────────────────
function TransfersSection({ adminSecret }: Props) {
  const { adminRequest, isLoading } = useAdminData();
  const { sheets: allSheets, fetchSheets, fetchSheetData, searchWorker, calculateBonus } = useGoogleSheets();
  const [transfers, setTransfers] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [transferDates, setTransferDates] = useState<string[]>(['']);
  const [selectedSheets, setSelectedSheets] = useState<string[]>([]);
  const [amount, setAmount] = useState('');
  const [bonusAmount, setBonusAmount] = useState('');
  const [rankingBonusAmount, setRankingBonusAmount] = useState('');
  const [reason, setReason] = useState('');
  const [creating, setCreating] = useState(false);
  const [fetchingEarnings, setFetchingEarnings] = useState(false);
  const [earningsFetched, setEarningsFetched] = useState(false);

  const cycleOptions = useMemo(() => getCycleOptions(6), []);
  const [selectedCycleIdx, setSelectedCycleIdx] = useState(0);
  const selectedCycleKey = getCycleKey(cycleOptions[selectedCycleIdx]);
  const [showCycleDropdown, setShowCycleDropdown] = useState(false);

  // Available (non-disabled) sheets
  const availableSheets = useMemo(() => allSheets.filter(s => !s.disabled), [allSheets]);

  // Fetch sheets on mount
  useEffect(() => { fetchSheets(); }, [fetchSheets]);

  // Auto-select all available sheets
  useEffect(() => {
    if (availableSheets.length > 0 && selectedSheets.length === 0) {
      setSelectedSheets(availableSheets.map(s => s.name));
    }
  }, [availableSheets, selectedSheets.length]);

  const load = useCallback(async () => {
    const res = await adminRequest(adminSecret, 'get_transfers', { cycle_key: selectedCycleKey });
    if (res?.transfers) setTransfers(res.transfers);
  }, [adminRequest, adminSecret, selectedCycleKey]);

  useEffect(() => { load(); }, [load]);

  // Auto-generate reason
  const generateReason = useCallback(() => {
    const src = sourceId.trim() ? `GHAS${sourceId.trim()}` : '';
    const tgt = targetId.trim() ? `GHAS${targetId.trim()}` : '';
    const validDates = transferDates.filter(d => d);
    if (!src || !tgt || validDates.length === 0) return '';
    const dateStr = validDates.map(d => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })).join(', ');
    const sheetStr = selectedSheets.length > 0 ? ` (${selectedSheets.join(', ')})` : '';
    return `${tgt} covered ${src}'s account on ${dateStr}${sheetStr}. Earnings transferred from ${src} to ${tgt}.`;
  }, [sourceId, targetId, transferDates, selectedSheets]);

  // Update reason when inputs change
  useEffect(() => {
    const autoReason = generateReason();
    if (autoReason) setReason(autoReason);
  }, [generateReason]);

  // Fetch earnings for source ID on selected dates/sheets
  const fetchEarnings = useCallback(async () => {
    const validDates = transferDates.filter(d => d);
    if (!sourceId.trim() || validDates.length === 0 || selectedSheets.length === 0) {
      toast.error('Enter source ID, at least one date, and select sheets first');
      return;
    }
    setFetchingEarnings(true);
    let totalVal = 0, totalBonus = 0, totalRanking = 0;

    try {
      for (const sheetName of selectedSheets) {
        const data = await fetchSheetData(sheetName);
        if (!data) continue;
        const worker = searchWorker(data, `NGDS${sourceId.trim()}`);
        if (!worker) continue;

        for (const dateStr of validDates) {
          const dateObj = new Date(dateStr + 'T12:00:00');
          const result = calculateBonus(worker, dateObj, dateObj);
          if (result && result.dailyBreakdown.length > 0) {
            result.dailyBreakdown.forEach(day => {
              totalVal += day.value || 0;
              totalBonus += day.bonus || 0;
              totalRanking += day.rankingBonus || 0;
            });
          }
        }
      }
      setAmount(totalVal.toString());
      setBonusAmount(totalBonus.toString());
      setRankingBonusAmount(totalRanking.toString());
      setEarningsFetched(true);
      if (totalVal > 0) {
        toast.success(`Found earnings: ₦${totalVal.toLocaleString()}`);
      } else {
        toast.warning('No earnings found for this ID on the selected dates/sheets');
      }
    } catch (err) {
      toast.error('Failed to fetch earnings');
    }
    setFetchingEarnings(false);
  }, [sourceId, transferDates, selectedSheets, fetchSheetData, searchWorker, calculateBonus]);

  const resetForm = () => {
    setSourceId(''); setTargetId(''); setTransferDates(['']); 
    setSelectedSheets(availableSheets.map(s => s.name));
    setAmount(''); setBonusAmount(''); setRankingBonusAmount(''); 
    setReason(''); setEarningsFetched(false);
  };

  const handleCreate = async () => {
    const validDates = transferDates.filter(d => d);
    if (!sourceId.trim() || !targetId.trim() || validDates.length === 0 || selectedSheets.length === 0 || !amount) {
      toast.error('Source ID, target ID, at least one date, sheets, and amount are required');
      return;
    }
    setCreating(true);
    let successCount = 0;
    // Create one transfer per date per sheet
    for (const date of validDates) {
      for (const sheet of selectedSheets) {
        const res = await adminRequest(adminSecret, 'create_transfer', {
          source_worker_id: `NGDS${sourceId.trim()}`,
          target_worker_id: `NGDS${targetId.trim()}`,
          transfer_date: date,
          sheet_name: sheet,
          amount: Number(amount),
          bonus_amount: Number(bonusAmount || 0),
          ranking_bonus_amount: Number(rankingBonusAmount || 0),
          reason,
          cycle_key: selectedCycleKey,
        });
        if (res?.success) successCount++;
      }
    }
    if (successCount > 0) {
      toast.success(`${successCount} transfer(s) recorded`);
      resetForm();
      setShowForm(false);
      load();
    } else {
      toast.error('Failed to create transfers');
    }
    setCreating(false);
  };

  const handleDelete = async (id: string) => {
    const res = await adminRequest(adminSecret, 'delete_transfer', { transfer_id: id });
    if (res?.success) { toast.success('Transfer deleted'); load(); }
    else toast.error('Failed to delete');
  };

  const toggleSheet = (name: string) => {
    setSelectedSheets(prev =>
      prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]
    );
    setEarningsFetched(false);
  };

  const addDate = () => setTransferDates(prev => [...prev, '']);
  const removeDate = (idx: number) => setTransferDates(prev => prev.filter((_, i) => i !== idx));
  const updateDate = (idx: number, val: string) => {
    setTransferDates(prev => prev.map((d, i) => i === idx ? val : d));
    setEarningsFetched(false);
  };

  return (
    <div className="space-y-4">
      {/* Info */}
      <Card className="bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
        <CardContent className="pt-3 px-4 pb-3">
          <div className="flex gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 dark:text-amber-300 space-y-1">
              <p className="font-medium">When to use Day Transfers:</p>
              <p>When someone covers another person's ID for a day. Earnings are auto-fetched from the sheet data. You can transfer for multiple dates at once.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cycle filter */}
      <div className="relative">
        <Button variant="outline" size="sm" className="w-full justify-between text-xs"
          onClick={() => setShowCycleDropdown(!showCycleDropdown)}>
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            <span>{cycleOptions[selectedCycleIdx].label}</span>
          </div>
          <ChevronDown className={`h-3 w-3 ml-1 opacity-50 transition-transform ${showCycleDropdown ? 'rotate-180' : ''}`} />
        </Button>
        {showCycleDropdown && (
          <Card className="absolute top-full left-0 right-0 mt-1 z-50 shadow-lg">
            <div className="py-1 max-h-[200px] overflow-y-auto">
              {cycleOptions.map((c, idx) => (
                <button key={getCycleKey(c)} onClick={() => { setSelectedCycleIdx(idx); setShowCycleDropdown(false); }}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-muted/50 ${selectedCycleIdx === idx ? 'bg-accent font-medium' : ''}`}>
                  {c.label} {idx === 0 && <Badge variant="secondary" className="text-[9px] h-4 ml-1">Current</Badge>}
                </button>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Create form */}
      {!showForm ? (
        <Button onClick={() => setShowForm(true)} className="w-full">
          <Plus className="h-4 w-4 mr-2" />Record Day Transfer
        </Button>
      ) : (
        <Card className="bg-muted/30">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Record Day Transfer</span>
              <button onClick={() => { setShowForm(false); resetForm(); }} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </CardTitle>
            <CardDescription className="text-xs">Transfer earnings from one ID to the person who actually worked</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            {/* Source & Target IDs with NGDS prefix */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Source ID (debit from)</Label>
                <div className="flex">
                  <span className="inline-flex items-center px-2 rounded-l-md border border-r-0 border-input bg-muted text-xs text-muted-foreground font-mono">NGDS</span>
                  <Input placeholder="2002" value={sourceId}
                    onChange={e => { setSourceId(e.target.value); setEarningsFetched(false); }}
                    className="text-sm font-mono rounded-l-none" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Target ID (credit to)</Label>
                <div className="flex">
                  <span className="inline-flex items-center px-2 rounded-l-md border border-r-0 border-input bg-muted text-xs text-muted-foreground font-mono">NGDS</span>
                  <Input placeholder="1001" value={targetId}
                    onChange={e => setTargetId(e.target.value)}
                    className="text-sm font-mono rounded-l-none" />
                </div>
              </div>
            </div>

            {/* Transfer Dates - multiple */}
            <div className="space-y-1.5">
              <Label className="text-xs">Transfer Date(s)</Label>
              <div className="space-y-2">
                {transferDates.map((d, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input type="date" value={d} onChange={e => updateDate(idx, e.target.value)}
                      className="text-sm h-9 flex-1" />
                    {transferDates.length > 1 && (
                      <Button variant="ghost" size="sm" className="h-9 px-2 text-destructive hover:text-destructive"
                        onClick={() => removeDate(idx)}>
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" className="w-full h-7 text-xs" onClick={addDate}>
                  <Plus className="h-3 w-3 mr-1" />Add another date
                </Button>
              </div>
            </div>

            {/* Sheet Selection - multi-select checkboxes */}
            <div className="space-y-1.5">
              <Label className="text-xs">Data Source Sheets</Label>
              <div className="border rounded-md p-2 max-h-[120px] overflow-y-auto space-y-1">
                {availableSheets.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Loading sheets...</p>
                ) : availableSheets.map(sheet => (
                  <label key={sheet.id} className="flex items-center gap-2 py-1 px-1 rounded hover:bg-muted/50 cursor-pointer">
                    <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${
                      selectedSheets.includes(sheet.name) ? 'bg-primary border-primary text-primary-foreground' : 'border-input'
                    }`} onClick={() => toggleSheet(sheet.name)}>
                      {selectedSheets.includes(sheet.name) && <Check className="h-3 w-3" />}
                    </div>
                    <span className="text-xs truncate">{sheet.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Fetch Earnings button */}
            <Button variant="outline" onClick={fetchEarnings} disabled={fetchingEarnings} className="w-full h-8 text-xs">
              {fetchingEarnings ? <Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1.5" />}
              {earningsFetched ? 'Re-fetch Earnings' : 'Fetch Earnings from Sheet'}
            </Button>

            {/* Amounts - editable */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Total Amount (₦)</Label>
                <Input type="number" placeholder="0" value={amount}
                  onChange={e => setAmount(e.target.value)} className="text-sm h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Bonus (₦)</Label>
                <Input type="number" placeholder="0" value={bonusAmount}
                  onChange={e => setBonusAmount(e.target.value)} className="text-sm h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Ranking (₦)</Label>
                <Input type="number" placeholder="0" value={rankingBonusAmount}
                  onChange={e => setRankingBonusAmount(e.target.value)} className="text-sm h-9" />
              </div>
            </div>

            {/* Reason - auto-generated, editable */}
            <div className="space-y-1.5">
              <Label className="text-xs">Reason (auto-generated, editable)</Label>
              <Textarea value={reason} onChange={e => setReason(e.target.value)}
                className="min-h-[50px] text-sm" />
            </div>

            <Button onClick={handleCreate} disabled={creating} className="w-full">
              {creating ? <RefreshCw className="h-3 w-3 mr-2 animate-spin" /> : <CheckIcon className="h-3 w-3 mr-2" />}
              Record Transfer{transferDates.filter(d => d).length > 1 ? `s (${transferDates.filter(d => d).length} dates)` : ''}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Transfers list */}
      <ScrollArea className="h-[350px]">
        <div className="space-y-2">
          {transfers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No day transfers recorded for this cycle</p>
          ) : transfers.map(t => (
            <Card key={t.id} className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant="outline" className="text-[10px] font-mono text-red-600 dark:text-red-400 border-red-300">{t.source_worker_id}</Badge>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <Badge variant="outline" className="text-[10px] font-mono text-green-600 dark:text-green-400 border-green-300">{t.target_worker_id}</Badge>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-[10px]">₦{Number(t.amount).toLocaleString()}</Badge>
                    <span className="text-[10px] text-muted-foreground">{t.sheet_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-0.5"><Calendar className="h-2.5 w-2.5" />Date: {new Date(t.transfer_date).toLocaleDateString()}</span>
                    <span>Recorded: {new Date(t.created_at).toLocaleString()}</span>
                  </div>
                  {t.reason && <p className="text-[11px] text-muted-foreground italic">{t.reason}</p>}
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-destructive hover:text-destructive shrink-0"
                  onClick={() => handleDelete(t.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>

      <Button variant="outline" size="sm" onClick={load} disabled={isLoading}>
        <RefreshCw className={`h-3 w-3 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />Refresh
      </Button>
    </div>
  );
}
