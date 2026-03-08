import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ArrowLeftRight, Plus, Trash2, RefreshCw, Calendar, ChevronDown,
  ArrowRight, FileText, X, CheckIcon, AlertTriangle, Check, Loader2, Search,
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
  const [searchQuery, setSearchQuery] = useState('');

  const cycleOptions = useMemo(() => getCycleOptions(6), []);
  const [selectedCycleIdx, setSelectedCycleIdx] = useState(0);
  const selectedCycleKey = getCycleKey(cycleOptions[selectedCycleIdx]);
  const [showCycleDropdown, setShowCycleDropdown] = useState(false);
  const cycleDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showCycleDropdown) return;
    const handler = (e: MouseEvent) => {
      if (cycleDropdownRef.current && !cycleDropdownRef.current.contains(e.target as Node)) {
        setShowCycleDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showCycleDropdown]);

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

  // Filter swaps by search
  const filteredSwaps = useMemo(() => {
    if (!searchQuery.trim()) return swaps;
    const q = searchQuery.trim().toUpperCase();
    return swaps.filter(s =>
      s.old_worker_id?.toUpperCase().includes(q) ||
      s.new_worker_id?.toUpperCase().includes(q) ||
      s.worker_name?.toUpperCase().includes(q)
    );
  }, [swaps, searchQuery]);

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
      <div className="relative" ref={cycleDropdownRef}>
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
              <Input placeholder="e.g. Adelaja" value={form.worker_name}
                onChange={e => setForm({ ...form, worker_name: e.target.value })} className="text-sm h-9" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Old Worker ID</Label>
                <Input placeholder="e.g. NGDS2002" value={form.old_worker_id}
                  onChange={e => setForm({ ...form, old_worker_id: e.target.value })} className="text-sm font-mono h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">New Worker ID</Label>
                <Input placeholder="e.g. NGDS1001" value={form.new_worker_id}
                  onChange={e => setForm({ ...form, new_worker_id: e.target.value })} className="text-sm font-mono h-9" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Effective Date (swap happened on this date)</Label>
              <Input type="date" value={form.effective_date}
                onChange={e => setForm({ ...form, effective_date: e.target.value })} className="text-sm h-9 w-full [&::-webkit-calendar-picker-indicator]:opacity-50" />
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

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search by ID – e.g. NGDS2002"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="text-xs h-8 pl-8 font-mono"
        />
      </div>

      {/* Swaps list */}
      <ScrollArea className="h-[350px]">
        <div className="space-y-2">
          {filteredSwaps.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {searchQuery.trim() ? 'No swaps found for this search' : 'No ID swaps recorded for this cycle'}
            </p>
          ) : filteredSwaps.map(s => (
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
  const [sourcePrefix, setSourcePrefix] = useState('GHAS');
  const [sourceId, setSourceId] = useState('');
  const [targetPrefix, setTargetPrefix] = useState('NGDS');
  const [targetId, setTargetId] = useState('');
  const [transferDates, setTransferDates] = useState<string[]>(['']);
  const [selectedSheets, setSelectedSheets] = useState<string[]>([]);
  const [reason, setReason] = useState('');
  const [creating, setCreating] = useState(false);
  const [fetchingEarnings, setFetchingEarnings] = useState(false);
  const [earningsFetched, setEarningsFetched] = useState(false);

  // Per-sheet fetched totals (editable)
  const [sheetTotals, setSheetTotals] = useState<Record<string, number>>({});

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
  const fullSourceId = `${sourcePrefix}${sourceId.trim()}`;
  const fullTargetId = `${targetPrefix}${targetId.trim()}`;

  const generateReason = useCallback(() => {
    if (!sourceId.trim() || !targetId.trim()) return '';
    const validDates = transferDates.filter(d => d);
    if (validDates.length === 0) return '';
    const dateStr = validDates.map(d => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })).join(', ');
    return `${fullTargetId} worked for ${fullSourceId} on ${dateStr}. Earnings transferred accordingly.`;
  }, [sourceId, targetId, transferDates, fullSourceId, fullTargetId]);

  // Update reason when inputs change
  useEffect(() => {
    const autoReason = generateReason();
    if (autoReason) setReason(autoReason);
  }, [generateReason]);

  // Fetch earnings for source ID on selected dates/sheets — returns total per sheet
  const fetchEarnings = useCallback(async () => {
    const validDates = transferDates.filter(d => d);
    if (!sourceId.trim() || validDates.length === 0 || selectedSheets.length === 0) {
      toast.error('Enter source ID, at least one date, and select sheets first');
      return;
    }
    setFetchingEarnings(true);
    const totals: Record<string, number> = {};

    try {
      for (const sheetName of selectedSheets) {
        const data = await fetchSheetData(sheetName);
        if (!data) continue;
        const worker = searchWorker(data, fullSourceId);
        if (!worker) continue;

        let sheetTotal = 0;
        for (const dateStr of validDates) {
          const dateObj = new Date(dateStr + 'T12:00:00');
          const result = calculateBonus(worker, dateObj, dateObj);
          if (result && result.dailyBreakdown.length > 0) {
            result.dailyBreakdown.forEach(day => {
              sheetTotal += day.value || 0;
            });
          }
        }
        totals[sheetName] = sheetTotal;
      }

      setSheetTotals(totals);
      setEarningsFetched(true);
      
      const grandTotal = Object.values(totals).reduce((s, v) => s + v, 0);
      if (grandTotal > 0) {
        toast.success(`Found total earnings: ₦${grandTotal.toLocaleString()}`);
      } else {
        toast.warning('No earnings found for this ID on the selected dates/sheets');
      }
    } catch (err) {
      toast.error('Failed to fetch earnings');
    }
    setFetchingEarnings(false);
  }, [sourceId, transferDates, selectedSheets, fetchSheetData, searchWorker, calculateBonus]);

  const resetForm = () => {
    setSourcePrefix('GHAS'); setSourceId(''); setTargetPrefix('NGDS'); setTargetId(''); 
    setTransferDates(['']); setSelectedSheets(availableSheets.map(s => s.name));
    setSheetTotals({}); setReason(''); setEarningsFetched(false);
  };

  // Grand total across all sheets
  const grandTotal = useMemo(() => Object.values(sheetTotals).reduce((s, v) => s + v, 0), [sheetTotals]);

  const handleCreate = async () => {
    const validDates = transferDates.filter(d => d);
    if (!sourceId.trim() || !targetId.trim() || !sourcePrefix.trim() || !targetPrefix.trim() || validDates.length === 0 || selectedSheets.length === 0 || grandTotal <= 0) {
      toast.error('Source ID, target ID, at least one date, sheets, and a positive amount are required');
      return;
    }
    setCreating(true);

    // Create ONE transfer record per date with sheet_amounts JSON for per-sheet breakdown
    let successCount = 0;

    for (const date of validDates) {
      // Build sheet_amounts JSON: { "Sheet Name": amount, ... }
      const sheetAmountsObj: Record<string, number> = {};
      for (const sheetName of selectedSheets) {
        const amt = sheetTotals[sheetName] || 0;
        if (amt > 0) sheetAmountsObj[sheetName] = amt;
      }

      const res = await adminRequest(adminSecret, 'create_transfer', {
        source_worker_id: fullSourceId,
        target_worker_id: fullTargetId,
        transfer_date: date,
        sheet_name: selectedSheets.join(', '),
        amount: grandTotal,
        bonus_amount: 0,
        ranking_bonus_amount: 0,
        reason,
        cycle_key: selectedCycleKey,
        sheet_amounts: sheetAmountsObj,
      });
      if (res?.success) successCount++;
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
    setSheetTotals(prev => {
      const copy = { ...prev };
      delete copy[name];
      return copy;
    });
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
            {/* Source & Target IDs */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Source ID (debit from)</Label>
                <div className="flex">
                  <Input placeholder="GHAS" value={sourcePrefix}
                    onChange={e => { setSourcePrefix(e.target.value.toUpperCase()); setEarningsFetched(false); }}
                    className="text-xs font-mono w-16 rounded-r-none border-r-0 bg-muted/50 px-1.5 h-9" />
                  <Input placeholder="2002" value={sourceId}
                    onChange={e => { setSourceId(e.target.value); setEarningsFetched(false); }}
                    className="text-sm font-mono rounded-l-none h-9" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Target ID (credit to)</Label>
                <div className="flex">
                  <Input placeholder="NGDS" value={targetPrefix}
                    onChange={e => setTargetPrefix(e.target.value.toUpperCase())
                    }
                    className="text-xs font-mono w-16 rounded-r-none border-r-0 bg-muted/50 px-1.5 h-9" />
                  <Input placeholder="1001" value={targetId}
                    onChange={e => setTargetId(e.target.value)}
                    className="text-sm font-mono rounded-l-none h-9" />
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

            {/* Per-sheet totals (editable) */}
            {earningsFetched && (
              <div className="space-y-2">
                <Label className="text-xs">Earnings per Sheet (editable)</Label>
                {selectedSheets.map(name => (
                  <div key={name} className="flex items-center gap-2">
                    <span className="text-xs truncate flex-1 min-w-0 text-muted-foreground">{name.split(' ')[0]}</span>
                    <div className="flex items-center">
                      <span className="text-xs text-muted-foreground mr-1">₦</span>
                      <Input
                        type="number"
                        value={sheetTotals[name] || 0}
                        onChange={e => setSheetTotals(prev => ({ ...prev, [name]: Number(e.target.value) || 0 }))}
                        className="text-sm h-8 w-28 font-mono"
                      />
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-1 border-t">
                  <span className="text-xs font-medium">Grand Total</span>
                  <span className="text-sm font-bold">₦{grandTotal.toLocaleString()}</span>
                </div>
              </div>
            )}

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
