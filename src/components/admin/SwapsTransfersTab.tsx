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
  const [transfers, setTransfers] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    source_worker_id: '', target_worker_id: '', transfer_date: '',
    sheet_name: '', amount: '', bonus_amount: '', ranking_bonus_amount: '', reason: '',
  });
  const [creating, setCreating] = useState(false);

  const cycleOptions = useMemo(() => getCycleOptions(6), []);
  const [selectedCycleIdx, setSelectedCycleIdx] = useState(0);
  const selectedCycleKey = getCycleKey(cycleOptions[selectedCycleIdx]);
  const [showCycleDropdown, setShowCycleDropdown] = useState(false);

  const load = useCallback(async () => {
    const res = await adminRequest(adminSecret, 'get_transfers', { cycle_key: selectedCycleKey });
    if (res?.transfers) setTransfers(res.transfers);
  }, [adminRequest, adminSecret, selectedCycleKey]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.source_worker_id.trim() || !form.target_worker_id.trim() || !form.transfer_date || !form.sheet_name.trim() || !form.amount) {
      toast.error('Source ID, target ID, date, sheet name, and amount are required');
      return;
    }
    setCreating(true);
    const res = await adminRequest(adminSecret, 'create_transfer', {
      ...form,
      amount: Number(form.amount),
      bonus_amount: Number(form.bonus_amount || 0),
      ranking_bonus_amount: Number(form.ranking_bonus_amount || 0),
      cycle_key: selectedCycleKey,
    });
    if (res?.success) {
      toast.success('Day transfer recorded');
      setForm({ source_worker_id: '', target_worker_id: '', transfer_date: '', sheet_name: '', amount: '', bonus_amount: '', ranking_bonus_amount: '', reason: '' });
      setShowForm(false);
      load();
    } else {
      toast.error(res?.error || 'Failed');
    }
    setCreating(false);
  };

  const handleDelete = async (id: string) => {
    const res = await adminRequest(adminSecret, 'delete_transfer', { transfer_id: id });
    if (res?.success) { toast.success('Transfer deleted'); load(); }
    else toast.error('Failed to delete');
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
              <p>When someone covers another person's ID for a day. The sheet shows earnings under the original ID owner, but you need to deduct it from them and credit it to the person who actually worked. Enter the exact amount from the sheet for that day.</p>
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
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </CardTitle>
            <CardDescription className="text-xs">Transfer a day's earnings from one ID to the person who actually worked</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Source ID (debit from)</Label>
                <Input placeholder="e.g. NGDS2002" value={form.source_worker_id}
                  onChange={e => setForm({ ...form, source_worker_id: e.target.value })} className="text-sm font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Target ID (credit to)</Label>
                <Input placeholder="e.g. NGDS1001" value={form.target_worker_id}
                  onChange={e => setForm({ ...form, target_worker_id: e.target.value })} className="text-sm font-mono" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Transfer Date</Label>
                <Input type="date" value={form.transfer_date}
                  onChange={e => setForm({ ...form, transfer_date: e.target.value })} className="text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Sheet Name</Label>
                <Input placeholder="e.g. Daily & Performance" value={form.sheet_name}
                  onChange={e => setForm({ ...form, sheet_name: e.target.value })} className="text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Total Amount (₦)</Label>
                <Input type="number" placeholder="0" value={form.amount}
                  onChange={e => setForm({ ...form, amount: e.target.value })} className="text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Bonus (₦)</Label>
                <Input type="number" placeholder="0" value={form.bonus_amount}
                  onChange={e => setForm({ ...form, bonus_amount: e.target.value })} className="text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Ranking (₦)</Label>
                <Input type="number" placeholder="0" value={form.ranking_bonus_amount}
                  onChange={e => setForm({ ...form, ranking_bonus_amount: e.target.value })} className="text-sm" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Reason (optional)</Label>
              <Textarea placeholder="e.g. Worker A was absent, Worker B covered..."
                value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}
                className="min-h-[50px] text-sm" />
            </div>
            <Button onClick={handleCreate} disabled={creating} className="w-full">
              {creating ? <RefreshCw className="h-3 w-3 mr-2 animate-spin" /> : <CheckIcon className="h-3 w-3 mr-2" />}
              Record Transfer
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
