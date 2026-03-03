import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield, KeyRound, AlertTriangle, CheckCircle2, ArrowLeft,
  Users, BarChart3, Database, Activity, Lock, Unlock, RefreshCw,
  Trash2, Search, UserCheck, Wifi, WifiOff, Clock, TrendingUp,
  Eye, Settings, Bell, AlertCircle, CheckIcon, Copy, X, ChevronDown,
  History, User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { useAdminData } from '@/hooks/useAdminData';
import { useSiteRestrictionAdmin } from '@/hooks/useSiteRestriction';
import { toast } from 'sonner';
import { formatNaira } from '@/utils/currencyUtils';

// ─── Admin Auth Gate ─────────────────────────────────────────
function AdminLogin({ onAuth }: { onAuth: (secret: string) => void }) {
  const [secret, setSecret] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      await onAuth(secret);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-xl">Admin Access</CardTitle>
          <CardDescription>Enter admin secret to continue</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="password"
              placeholder="Admin secret"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && secret && !isLoading && handleLogin()}
              className="pl-10"
              disabled={isLoading}
            />
          </div>
          <Button className="w-full" disabled={!secret || isLoading} onClick={handleLogin}>
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Logging in...
              </>
            ) : (
              'Unlock'
            )}
          </Button>
          <Link
            to="/"
            className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Stat Card ───────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, sub, onClick, active }: { label: string; value: string | number; icon: React.ElementType; sub?: string; onClick?: () => void; active?: boolean }) {
  return (
    <Card className={`${onClick ? 'cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all' : ''} ${active ? 'ring-2 ring-primary' : ''}`} onClick={onClick}>
      <CardContent className="pt-4 pb-3 px-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Worker Detail Modal ─────────────────────────────────────
function WorkerDetailModal({ workerId, adminSecret, open, onClose }: { workerId: string | null; adminSecret: string; open: boolean; onClose: () => void }) {
  const { adminRequest } = useAdminData();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !workerId) { setData(null); return; }
    setLoading(true);
    adminRequest(adminSecret, 'get_worker_detail', { worker_id: workerId })
      .then(res => { if (res) setData(res); })
      .finally(() => setLoading(false));
  }, [open, workerId, adminSecret, adminRequest]);

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    const now = Date.now();
    const diff = now - d.getTime();
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-4 w-4" />
            {workerId}
          </DialogTitle>
          <DialogDescription>Worker details, earnings & login history</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12"><RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : data ? (
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-4 pb-2">
              {/* Status badges */}
              <div className="flex flex-wrap gap-1.5">
                {data.has_pin ? (
                  <Badge variant="secondary" className="text-[10px] gap-0.5"><Lock className="h-2.5 w-2.5" />PIN Set {data.pin_created ? `· ${new Date(data.pin_created).toLocaleDateString()}` : ''}</Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] gap-0.5"><Unlock className="h-2.5 w-2.5" />No PIN</Badge>
                )}
                {data.identity_confirmed && (
                  <Badge variant="secondary" className="text-[10px] gap-0.5 bg-green-500/10 text-green-700 dark:text-green-400"><UserCheck className="h-2.5 w-2.5" />Confirmed</Badge>
                )}
              </div>

              {/* Earnings Summary */}
              <Card>
                <CardHeader className="py-2.5 px-3">
                  <CardTitle className="text-xs flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5" />Total Earnings</CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <p className="text-xl font-bold">{formatNaira(data.grand_total)}</p>
                  {data.earnings_by_cycle?.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {data.earnings_by_cycle.map((c: any) => (
                        <div key={c.cycle_key} className="border rounded-md p-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-medium">{c.cycle_key}</span>
                            <span className="text-xs font-semibold font-mono">{formatNaira(c.total)}</span>
                          </div>
                          <div className="mt-1.5 space-y-0.5">
                            {c.sheets.map((s: any, i: number) => (
                              <div key={i} className="flex justify-between text-[11px] text-muted-foreground pl-2">
                                <span className="truncate max-w-[180px]">{s.sheet}</span>
                                <span className="font-mono">{formatNaira(s.amount)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {(!data.earnings_by_cycle || data.earnings_by_cycle.length === 0) && (
                    <p className="text-xs text-muted-foreground mt-2">No cached earnings data</p>
                  )}
                </CardContent>
              </Card>

              {/* Login History */}
              <Card>
                <CardHeader className="py-2.5 px-3">
                  <CardTitle className="text-xs flex items-center gap-1.5"><History className="h-3.5 w-3.5" />Login History ({data.total_sessions})</CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  {data.sessions?.length > 0 ? (
                    <div className="space-y-1">
                      {data.sessions.map((s: any, i: number) => {
                        const isActive = (Date.now() - new Date(s.last_heartbeat).getTime()) < 15 * 60 * 1000;
                        return (
                          <div key={i} className="flex items-center justify-between text-[11px] py-1.5 px-2 rounded hover:bg-muted/50">
                            <div className="flex items-center gap-1.5">
                              {isActive ? <Wifi className="h-2.5 w-2.5 text-emerald-500" /> : <WifiOff className="h-2.5 w-2.5 text-muted-foreground" />}
                              <span className="text-muted-foreground">{s.device_fingerprint?.substring(0, 8)}...</span>
                            </div>
                            <span className="text-muted-foreground">{formatTime(s.created_at)}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No session history</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">Failed to load worker data</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Workers Tab ─────────────────────────────────────────────
function WorkersTab({ adminSecret }: { adminSecret: string }) {
  const { adminRequest, isLoading } = useAdminData();
  const [data, setData] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [resetLoading, setResetLoading] = useState<string | null>(null);
  const [onlineFilter, setOnlineFilter] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await adminRequest(adminSecret, 'get_workers');
    if (res) setData(res);
  }, [adminRequest, adminSecret]);

  useEffect(() => { load(); }, [load]);

  const handleResetPin = async (workerId: string) => {
    setResetLoading(workerId);
    const res = await adminRequest(adminSecret, 'reset_pin', { worker_id: workerId });
    if (res?.success) {
      toast.success(`PIN reset for ${workerId}`);
      load();
    } else {
      toast.error(res?.error || 'Failed to reset PIN');
    }
    setResetLoading(null);
  };

  if (!data) return <div className="flex items-center justify-center py-12"><RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  const isWorkerOnline = (w: any) => w.sessions?.some((s: any) => (Date.now() - new Date(s.last_heartbeat).getTime()) < 15 * 60 * 1000);

  let filtered = data.workers?.filter((w: any) =>
    w.worker_id.toLowerCase().includes(search.toLowerCase())
  ) || [];

  if (onlineFilter) {
    filtered = filtered.filter(isWorkerOnline);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Workers" value={data.total_workers} icon={Users} />
        <StatCard label="With PIN" value={data.total_with_pins} icon={Lock} />
        <StatCard label="Confirmed" value={data.total_confirmed} icon={UserCheck} />
        <StatCard
          label="Active Now"
          value={data.total_active_sessions}
          icon={Wifi}
          onClick={() => setOnlineFilter(!onlineFilter)}
          active={onlineFilter}
        />
      </div>

      {onlineFilter && (
        <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2">
          <div className="flex items-center gap-1.5">
            <Wifi className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Showing online workers only</span>
          </div>
          <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => setOnlineFilter(false)}>
            <X className="h-3 w-3 mr-1" />Cancel
          </Button>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search workers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <ScrollArea className="h-[400px]">
        <div className="space-y-2">
          {filtered.map((w: any) => {
            const isOnline = isWorkerOnline(w);
            return (
              <Card key={w.worker_id} className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold">
                      {w.worker_id.substring(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <button
                        onClick={() => setSelectedWorker(w.worker_id)}
                        className="text-sm font-medium truncate text-primary hover:underline cursor-pointer"
                      >
                        {w.worker_id}
                      </button>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {w.has_pin ? (
                          <Badge variant="secondary" className="text-[10px] gap-0.5 h-4"><Lock className="h-2.5 w-2.5" />PIN</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] gap-0.5 h-4"><Unlock className="h-2.5 w-2.5" />No PIN</Badge>
                        )}
                        {w.identity_confirmed && (
                          <Badge variant="secondary" className="text-[10px] gap-0.5 h-4 bg-green-500/10 text-green-700 dark:text-green-400"><UserCheck className="h-2.5 w-2.5" />Confirmed</Badge>
                        )}
                        {isOnline ? (
                          <Badge variant="secondary" className="text-[10px] gap-0.5 h-4 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"><Wifi className="h-2.5 w-2.5" />Online</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] gap-0.5 h-4"><WifiOff className="h-2.5 w-2.5" />Offline</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  {w.has_pin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-destructive hover:text-destructive shrink-0"
                      onClick={() => handleResetPin(w.worker_id)}
                      disabled={resetLoading === w.worker_id}
                    >
                      {resetLoading === w.worker_id ? <RefreshCw className="h-3 w-3 animate-spin" /> : 'Reset PIN'}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              {onlineFilter ? 'No workers currently online' : 'No workers found'}
            </p>
          )}
        </div>
      </ScrollArea>

      <Button variant="outline" size="sm" onClick={load} disabled={isLoading}>
        <RefreshCw className={`h-3 w-3 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
        Refresh
      </Button>

      <WorkerDetailModal
        workerId={selectedWorker}
        adminSecret={adminSecret}
        open={!!selectedWorker}
        onClose={() => setSelectedWorker(null)}
      />
    </div>
  );
}

// ─── Earnings Audit Tab ──────────────────────────────────────
function EarningsTab({ adminSecret }: { adminSecret: string }) {
  const { adminRequest, isLoading } = useAdminData();
  const [data, setData] = useState<any>(null);
  const [expandedSheet, setExpandedSheet] = useState<string | null>(null);
  const [selectedCycle, setSelectedCycle] = useState<string | null>(null);
  const [showCycleDropdown, setShowCycleDropdown] = useState(false);

  const load = useCallback(async (cycleKey?: string | null) => {
    const params = cycleKey ? { cycle_key: cycleKey } : undefined;
    const res = await adminRequest(adminSecret, 'get_earnings_overview', params);
    if (res) setData(res);
  }, [adminRequest, adminSecret]);

  useEffect(() => { load(); }, [load]);

  const handleCycleChange = (cycleKey: string | null) => {
    setSelectedCycle(cycleKey);
    setShowCycleDropdown(false);
    load(cycleKey);
  };

  if (!data) return <div className="flex items-center justify-center py-12"><RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  const grandTotal = data.top_earners?.reduce((sum: number, e: any) => sum + e.total, 0) || 0;

  return (
    <div className="space-y-4">
      {/* Cycle filter */}
      {data.available_cycles?.length > 0 && (
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-between text-xs"
            onClick={() => setShowCycleDropdown(!showCycleDropdown)}
          >
            <span>{selectedCycle || 'All Cycles (Combined)'}</span>
            <ChevronDown className="h-3 w-3 ml-1 opacity-50" />
          </Button>
          {showCycleDropdown && (
            <Card className="absolute top-full left-0 right-0 mt-1 z-50 shadow-lg">
              <div className="py-1">
                <button
                  onClick={() => handleCycleChange(null)}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-muted/50 ${!selectedCycle ? 'bg-accent font-medium' : ''}`}
                >
                  All Cycles (Combined)
                </button>
                {data.available_cycles.map((c: string) => (
                  <button
                    key={c}
                    onClick={() => handleCycleChange(c)}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-muted/50 ${selectedCycle === c ? 'bg-accent font-medium' : ''}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Cached Records" value={data.total_records} icon={Database} />
        <StatCard label={selectedCycle ? 'Cycle Total' : 'Grand Total'} value={formatNaira(grandTotal)} icon={TrendingUp} />
      </div>

      {/* Top Earners */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4" />Top 20 Earners
            {selectedCycle && <Badge variant="outline" className="text-[10px] ml-1">{selectedCycle}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <ScrollArea className="h-[200px]">
            <div className="space-y-2">
              {data.top_earners?.map((e: any, i: number) => (
                <div key={e.worker_id} className="flex items-center justify-between text-sm p-2 rounded hover:bg-muted/50">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-5 font-bold">{i + 1}.</span>
                    <span className="font-medium">{e.worker_id}</span>
                  </div>
                  <span className="font-mono text-xs font-semibold">{formatNaira(e.total)}</span>
                </div>
              ))}
              {(!data.top_earners || data.top_earners.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">No earnings data cached yet</p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Earnings by Sheet */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm flex items-center gap-1.5"><Eye className="h-4 w-4" />Earnings Per Sheet</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <ScrollArea className="h-[250px]">
            <div className="space-y-2">
              {data.by_sheet?.map((s: any) => (
                <div key={s.sheet} className="border rounded-md p-2">
                  <button
                    onClick={() => setExpandedSheet(expandedSheet === s.sheet ? null : s.sheet)}
                    className="w-full flex items-center justify-between text-sm hover:bg-muted/50 p-1 rounded transition-colors"
                  >
                    <div className="flex items-center gap-2 flex-1 text-left min-w-0">
                      <span className="truncate max-w-[150px] font-medium">{s.sheet}</span>
                      <Badge variant="outline" className="text-[10px] shrink-0">{s.worker_count || 0} workers</Badge>
                    </div>
                    <span className="font-mono text-xs font-semibold whitespace-nowrap">{formatNaira(s.total)}</span>
                  </button>
                  {expandedSheet === s.sheet && s.workers && (
                    <div className="mt-2 pt-2 border-t space-y-1 text-xs">
                      {s.workers.map((w: any, i: number) => (
                        <div key={i} className="flex justify-between text-[11px] text-muted-foreground pl-2">
                          <span>{w.worker_id}</span>
                          <span>{formatNaira(w.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Button variant="outline" size="sm" onClick={() => load(selectedCycle)} disabled={isLoading}>
        <RefreshCw className={`h-3 w-3 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
        Refresh
      </Button>
    </div>
  );
}

// ─── Cache Tab ───────────────────────────────────────────────
function CacheTab({ adminSecret }: { adminSecret: string }) {
  const { adminRequest, isLoading } = useAdminData();
  const [data, setData] = useState<any>(null);

  const load = useCallback(async () => {
    const res = await adminRequest(adminSecret, 'get_cache_stats');
    if (res) setData(res);
  }, [adminRequest, adminSecret]);

  useEffect(() => { load(); }, [load]);

  const handleClear = async (cycleKey: string) => {
    const res = await adminRequest(adminSecret, 'clear_cache', { cycle_key: cycleKey });
    if (res?.cleared) {
      toast.success(`Cache cleared for ${cycleKey}`);
      load();
    } else {
      toast.error('Failed to clear cache');
    }
  };

  if (!data) return <div className="flex items-center justify-center py-12"><RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Sheet Caches" value={data.total_sheet_cache} icon={Database} />
        <StatCard label="Worker Caches" value={data.total_worker_cache} icon={Users} />
      </div>

      <ScrollArea className="h-[300px]">
        <div className="space-y-2">
          {data.cycles?.map((c: any) => (
            <Card key={c.cycle_key} className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{c.cycle_key}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {c.sheets} sheets · {c.workers} worker records · Updated {new Date(c.lastUpdated).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-destructive hover:text-destructive shrink-0"
                  onClick={() => handleClear(c.cycle_key)}
                  disabled={isLoading}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              </div>
            </Card>
          ))}
          {(!data.cycles || data.cycles.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-8">No cached data</p>
          )}
        </div>
      </ScrollArea>

      <Button variant="outline" size="sm" onClick={load} disabled={isLoading}>
        <RefreshCw className={`h-3 w-3 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
        Refresh
      </Button>
    </div>
  );
}

// ─── Activity Tab ────────────────────────────────────────────
function ActivityTab({ adminSecret }: { adminSecret: string }) {
  const { adminRequest, isLoading } = useAdminData();
  const [data, setData] = useState<any>(null);

  const load = useCallback(async () => {
    const res = await adminRequest(adminSecret, 'get_activity');
    if (res) setData(res);
  }, [adminRequest, adminSecret]);

  useEffect(() => { load(); }, [load]);

  if (!data) return <div className="flex items-center justify-center py-12"><RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    const now = Date.now();
    const diff = now - d.getTime();
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString();
  };

  type ActivityItem = { type: string; worker_id: string; time: string; detail?: string };

  const allActivity: ActivityItem[] = [
    ...(data.recent_pins?.map((p: any) => ({ type: 'pin', worker_id: p.worker_id, time: p.created_at, detail: 'Set PIN' })) || []),
    ...(data.recent_identities?.map((i: any) => ({ type: 'confirm', worker_id: i.worker_id, time: i.confirmed_at, detail: 'Confirmed identity' })) || []),
    ...(data.recent_sessions?.map((s: any) => ({ type: 'session', worker_id: s.worker_id, time: s.created_at, detail: 'Started session' })) || []),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 30);

  const iconMap: Record<string, React.ElementType> = { pin: Lock, confirm: UserCheck, session: Wifi };
  const colorMap: Record<string, string> = { pin: 'text-amber-500', confirm: 'text-green-500', session: 'text-blue-500' };

  return (
    <div className="space-y-4">
      <ScrollArea className="h-[450px]">
        <div className="space-y-1">
          {allActivity.map((a, i) => {
            const Icon = iconMap[a.type] || Activity;
            return (
              <div key={i} className="flex items-center gap-3 py-2 px-2 rounded-md hover:bg-muted/50">
                <Icon className={`h-4 w-4 shrink-0 ${colorMap[a.type] || 'text-muted-foreground'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">{a.worker_id}</span>
                    <span className="text-muted-foreground"> · {a.detail}</span>
                  </p>
                </div>
                <span className="text-[11px] text-muted-foreground shrink-0 flex items-center gap-1">
                  <Clock className="h-3 w-3" />{formatTime(a.time)}
                </span>
              </div>
            );
          })}
          {allActivity.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No recent activity</p>
          )}
        </div>
      </ScrollArea>

      <Button variant="outline" size="sm" onClick={load} disabled={isLoading}>
        <RefreshCw className={`h-3 w-3 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
        Refresh
      </Button>
    </div>
  );
}

// ─── Settings Tab ────────────────────────────────────────────
function SettingsTab({ adminSecret }: { adminSecret: string }) {
  const { isRestricted, message, toggle, isLoading: settingsLoading } = useSiteRestrictionAdmin(adminSecret);
  const [restrictionMessage, setRestrictionMessage] = useState('');
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!settingsLoading && !initialized) {
      setRestrictionMessage(message || 'The site is currently under maintenance. Please check back later.');
      setInitialized(true);
    }
  }, [settingsLoading, message, initialized]);

  const handleToggleRestriction = async () => {
    const newState = await toggle(restrictionMessage);
    toast.success(`Site ${newState ? 'restricted' : 'unrestricted'}`);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm flex items-center gap-1.5"><Lock className="h-4 w-4" />Site Restriction</CardTitle>
          <CardDescription className="text-xs">Prevent users from accessing the site with a maintenance message</CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50">
            <div className="flex-1">
              <p className="text-sm font-medium">
                {isRestricted ? 'Site is Restricted' : 'Site is Open'}
              </p>
              <p className="text-xs text-muted-foreground">
                {isRestricted ? 'Users will see maintenance page' : 'Users can access normally'}
              </p>
            </div>
            <Button
              variant={isRestricted ? 'destructive' : 'outline'}
              size="sm"
              onClick={handleToggleRestriction}
              className="shrink-0"
            >
              {isRestricted ? 'Unrestrict' : 'Restrict'}
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message" className="text-xs font-medium">Maintenance Message</Label>
            <Textarea
              id="message"
              placeholder="Enter the message users will see when site is restricted..."
              value={restrictionMessage}
              onChange={(e) => setRestrictionMessage(e.target.value)}
              className="min-h-[80px] text-sm"
            />
            <p className="text-[11px] text-muted-foreground">This message will be shown to users when the site is restricted</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-3 px-4 pb-3">
          <div className="flex gap-2">
            <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-800 dark:text-blue-300">
              When enabled, users will be redirected to a maintenance page. Their sessions remain valid and will resume once restriction is lifted.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Alerts Tab ──────────────────────────────────────────────
function AlertsTab({ adminSecret }: { adminSecret: string }) {
  const { adminRequest, isLoading } = useAdminData();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ title: '', message: '', type: 'info' });
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const res = await adminRequest(adminSecret, 'get_alerts');
    if (res?.alerts) setAlerts(res.alerts);
  }, [adminRequest, adminSecret]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!formData.title.trim() || !formData.message.trim()) {
      toast.error('Title and message are required');
      return;
    }
    setLoading(true);
    const res = await adminRequest(adminSecret, 'create_alert', formData);
    if (res?.success) {
      toast.success('Alert created');
      setFormData({ title: '', message: '', type: 'info' });
      setShowForm(false);
      load();
    } else {
      toast.error('Failed to create alert');
    }
    setLoading(false);
  };

  const handleDelete = async (alertId: string) => {
    const res = await adminRequest(adminSecret, 'delete_alert', { alert_id: alertId });
    if (res?.success) {
      toast.success('Alert deleted');
      load();
    } else {
      toast.error('Failed to delete alert');
    }
  };

  const handleToggle = async (alertId: string, currentActive: boolean) => {
    const res = await adminRequest(adminSecret, 'toggle_alert', { alert_id: alertId, is_active: !currentActive });
    if (res?.success) {
      toast.success(`Alert ${!currentActive ? 'activated' : 'deactivated'}`);
      load();
    } else {
      toast.error('Failed to toggle alert');
    }
  };

  const typeColors: Record<string, { bg: string; border: string; icon: React.ElementType }> = {
    info: { bg: 'bg-[hsl(210,60%,95%)] dark:bg-[hsl(210,40%,15%)]', border: 'border-[hsl(210,60%,80%)] dark:border-[hsl(210,40%,30%)]', icon: AlertCircle },
    warning: { bg: 'bg-[hsl(35,90%,95%)] dark:bg-[hsl(35,40%,12%)]', border: 'border-[hsl(35,80%,70%)] dark:border-[hsl(35,50%,30%)]', icon: AlertTriangle },
    error: { bg: 'bg-[hsl(0,70%,96%)] dark:bg-[hsl(0,40%,12%)]', border: 'border-[hsl(0,60%,80%)] dark:border-[hsl(0,40%,30%)]', icon: AlertTriangle },
    success: { bg: 'bg-[hsl(145,50%,95%)] dark:bg-[hsl(145,30%,12%)]', border: 'border-[hsl(145,50%,75%)] dark:border-[hsl(145,30%,30%)]', icon: CheckCircle2 },
  };

  return (
    <div className="space-y-4">
      {!showForm ? (
        <Button onClick={() => setShowForm(true)} className="w-full">
          <Bell className="h-4 w-4 mr-2" />
          Create New Alert
        </Button>
      ) : (
        <Card className="bg-muted/30">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Create Alert</span>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-xs font-medium">Title</Label>
              <Input
                id="title"
                placeholder="Alert title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="msg" className="text-xs font-medium">Message</Label>
              <Textarea
                id="msg"
                placeholder="Alert message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="min-h-[60px] text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="type" className="text-xs font-medium">Type</Label>
              <select
                id="type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-2 py-1.5 text-sm border rounded-md bg-background"
              >
                <option value="info">ℹ️ Info</option>
                <option value="warning">⚠️ Warning</option>
                <option value="error">🚨 Error</option>
                <option value="success">✅ Success</option>
              </select>
            </div>
            <Button onClick={handleCreate} disabled={loading} className="w-full">
              {loading ? <RefreshCw className="h-3 w-3 mr-2 animate-spin" /> : <CheckIcon className="h-3 w-3 mr-2" />}
              Create Alert
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        <p className="text-sm font-medium">Active Alerts ({alerts.length})</p>
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No active alerts</p>
        ) : (
          <ScrollArea className="h-[350px]">
            <div className="space-y-2">
              {alerts.map((alert) => {
                const colors = typeColors[alert.alert_type] || typeColors.info;
                const Icon = colors.icon;
                const isActive = alert.is_active;
                return (
                  <Card key={alert.id} className={`${isActive ? colors.bg : 'bg-muted/30 opacity-60'} ${isActive ? colors.border : 'border-border'} border`}>
                    <CardContent className="pt-3 px-4 pb-3">
                      <div className="flex gap-3">
                        <Icon className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{alert.title}</p>
                            {!isActive && <Badge variant="outline" className="text-[10px] h-4">Inactive</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{alert.message}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <Badge variant="secondary" className="text-[10px] h-4 capitalize">{alert.alert_type}</Badge>
                            {alert.created_at && (
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(alert.created_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggle(alert.id, isActive)}
                            className={`h-7 text-xs shrink-0 ${isActive ? 'text-amber-600 hover:text-amber-700' : 'text-green-600 hover:text-green-700'}`}
                          >
                            {isActive ? <Eye className="h-3 w-3" /> : <CheckIcon className="h-3 w-3" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(alert.id)}
                            className="h-7 text-destructive hover:text-destructive shrink-0"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </div>

      <Button variant="outline" size="sm" onClick={load} disabled={isLoading}>
        <RefreshCw className={`h-3 w-3 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
        Refresh
      </Button>
    </div>
  );
}

// ─── Main Admin Page ─────────────────────────────────────────
export default function AdminPinReset() {
  const [adminSecret, setAdminSecret] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);
  const { adminRequest } = useAdminData();

  const handleAuth = async (secret: string) => {
    setAuthError(false);
    const res = await adminRequest(secret, 'get_workers');
    if (res) {
      setAdminSecret(secret);
    } else {
      setAuthError(true);
      toast.error('Invalid admin secret');
    }
  };

  if (!adminSecret) {
    return <AdminLogin onAuth={handleAuth} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center">
              <Shield className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">Admin Panel</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs gap-1">
              <Lock className="h-3 w-3" />
              Authenticated
            </Badge>
            <Link to="/">
              <Button variant="ghost" size="sm" className="h-8 text-xs">
                <ArrowLeft className="h-3 w-3 mr-1" />
                Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 max-w-2xl">
        <Tabs defaultValue="workers" className="space-y-4">
          <TabsList className="grid w-full grid-cols-6 h-9 gap-1">
            <TabsTrigger value="workers" className="text-xs gap-0.5 px-1">
              <Users className="h-3 w-3" />
              <span className="hidden sm:inline">Workers</span>
            </TabsTrigger>
            <TabsTrigger value="earnings" className="text-xs gap-0.5 px-1">
              <TrendingUp className="h-3 w-3" />
              <span className="hidden sm:inline">Earnings</span>
            </TabsTrigger>
            <TabsTrigger value="cache" className="text-xs gap-0.5 px-1">
              <Database className="h-3 w-3" />
              <span className="hidden sm:inline">Cache</span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="text-xs gap-0.5 px-1">
              <Activity className="h-3 w-3" />
              <span className="hidden sm:inline">Activity</span>
            </TabsTrigger>
            <TabsTrigger value="alerts" className="text-xs gap-0.5 px-1">
              <Bell className="h-3 w-3" />
              <span className="hidden sm:inline">Alerts</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-xs gap-0.5 px-1">
              <Settings className="h-3 w-3" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="workers">
            <WorkersTab adminSecret={adminSecret} />
          </TabsContent>
          <TabsContent value="earnings">
            <EarningsTab adminSecret={adminSecret} />
          </TabsContent>
          <TabsContent value="cache">
            <CacheTab adminSecret={adminSecret} />
          </TabsContent>
          <TabsContent value="activity">
            <ActivityTab adminSecret={adminSecret} />
          </TabsContent>
          <TabsContent value="alerts">
            <AlertsTab adminSecret={adminSecret} />
          </TabsContent>
          <TabsContent value="settings">
            <SettingsTab adminSecret={adminSecret} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
