import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield, KeyRound, AlertTriangle, CheckCircle2, ArrowLeft,
  Users, BarChart3, Database, Activity, Lock, Unlock, RefreshCw,
  Trash2, Search, UserCheck, Wifi, WifiOff, Clock, TrendingUp,
  Eye, Settings, Bell, AlertCircle, CheckIcon, Copy, X, ChevronDown,
  History, User, Calendar, MessageSquare, ThumbsUp, ThumbsDown,
  ArrowLeftRight, FileText, StickyNote, ClipboardList,
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
import { SwapsTransfersTab } from '@/components/admin/SwapsTransfersTab';
import { AuditLogTab } from '@/components/admin/AuditLogTab';
import { CycleReportTab } from '@/components/admin/CycleReportTab';
import { WorkerNotesTab } from '@/components/admin/WorkerNotesTab';
import { StageTotalsTab } from '@/components/admin/StageTotalsTab';
import { IntroAnimationTab } from '@/components/admin/IntroAnimationTab';
import { ThemeSwitcher } from '@/components/dashboard/ThemeSwitcher';
import { useTheme, type Theme, type AccentColor } from '@/hooks/useTheme';
import { toast } from 'sonner';
import { formatNaira } from '@/utils/currencyUtils';
import { getCycleOptions, getCycleKey } from '@/lib/cycleUtils';

// ─── Admin Auth Gate ─────────────────────────────────────────
function AdminLogin({
  onAuth,
  theme,
  accentColor,
  onThemeChange,
  onAccentChange,
}: {
  onAuth: (secret: string) => void;
  theme: Theme;
  accentColor: AccentColor;
  onThemeChange: (theme: Theme) => void;
  onAccentChange: (accent: AccentColor) => void;
}) {
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
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 px-4 py-6 sm:py-10">
      <div className="mx-auto mb-8 flex w-full max-w-5xl items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <ThemeSwitcher
          theme={theme}
          accentColor={accentColor}
          onThemeChange={onThemeChange}
          onAccentChange={onAccentChange}
        />
      </div>

      <Card className="mx-auto w-full max-w-md border-primary/20 shadow-lg shadow-primary/10">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-7 w-7 text-primary" />
          </div>
          <Badge variant="secondary" className="mx-auto w-fit">Protected Route</Badge>
          <CardTitle className="text-2xl">Admin Access</CardTitle>
          <CardDescription>Enter your admin secret to continue securely.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative space-y-2">
            <Label htmlFor="admin-secret" className="text-xs uppercase tracking-wide text-muted-foreground">
              Secret key
            </Label>
            <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="admin-secret"
              type="password"
              placeholder="Enter admin secret"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && secret && !isLoading && handleLogin()}
              className="h-11 pl-10"
              disabled={isLoading}
            />
          </div>
          <Button className="h-11 w-full" disabled={!secret || isLoading} onClick={handleLogin}>
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Logging in...
              </>
            ) : (
              'Unlock'
            )}
          </Button>
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
  const [expandedCycle, setExpandedCycle] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !workerId) { setData(null); setExpandedCycle(null); return; }
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

  const formatCycleLabel = (key: string) => {
    const [year, month] = key.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const m = parseInt(month, 10);
    const nextMonth = m === 12 ? 1 : m + 1;
    const nextYear = m === 12 ? parseInt(year) + 1 : parseInt(year);
    return `${months[m - 1]} 16 - ${months[nextMonth - 1]} 15, ${m === 12 ? nextYear : year}`;
  };

  // Compute stats
  const totalCycles = data?.earnings_by_cycle?.length || 0;
  const totalSheets = data?.earnings_by_cycle?.reduce((sum: number, c: any) => sum + (c.sheets?.length || 0), 0) || 0;
  const avgPerCycle = totalCycles > 0 ? (data?.grand_total || 0) / totalCycles : 0;
  const bestCycle = data?.earnings_by_cycle?.reduce((best: any, c: any) => (!best || c.total > best.total) ? c : best, null);

  const [logoutLoading, setLogoutLoading] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleForceLogout = async () => {
    if (!workerId) return;
    setLogoutLoading(true);
    setShowLogoutConfirm(false);
    const res = await adminRequest(adminSecret, 'force_logout', { worker_id: workerId });
    if (res?.success) {
      toast.success(`Successfully force logged out ${workerId}. They will be disconnected within 30 seconds.`);
      const refreshed = await adminRequest(adminSecret, 'get_worker_detail', { worker_id: workerId });
      if (refreshed) setData(refreshed);
    } else {
      toast.error(res?.error || 'Failed to force logout');
    }
    setLogoutLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-sm font-bold shrink-0">
              {workerId?.substring(0, 2)}
            </div>
            <div className="min-w-0">
              <span className="font-mono">{workerId}</span>
            </div>
          </DialogTitle>
          <DialogDescription>Comprehensive worker overview</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12"><RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : data ? (
          <div className="space-y-4 pb-4">
            {/* Grand Total - Big display */}
            <div className="rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Balance</p>
              <p className="text-3xl font-bold text-foreground">{formatNaira(data.grand_total)}</p>
              <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground">
                <span>{totalCycles} cycle{totalCycles !== 1 ? 's' : ''}</span>
                <span className="h-3 w-px bg-border" />
                <span>{totalSheets} sheet record{totalSheets !== 1 ? 's' : ''}</span>
              </div>
            </div>

            {/* Quick Stats Row */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border bg-card p-2.5 text-center">
                <p className="text-[10px] text-muted-foreground">Avg/Cycle</p>
                <p className="text-sm font-semibold font-mono">{formatNaira(avgPerCycle)}</p>
              </div>
              <div className="rounded-lg border bg-card p-2.5 text-center">
                <p className="text-[10px] text-muted-foreground">Best Cycle</p>
                <p className="text-sm font-semibold font-mono">{bestCycle ? formatNaira(bestCycle.total) : '-'}</p>
              </div>
              <div className="rounded-lg border bg-card p-2.5 text-center">
                <p className="text-[10px] text-muted-foreground">Sessions</p>
                <p className="text-sm font-semibold">{data.total_sessions}</p>
              </div>
            </div>

            {/* Account Status + Force Logout */}
            <Card>
              <CardHeader className="py-2.5 px-3">
                <CardTitle className="text-xs flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" />Account Status</span>
                  {data.total_sessions > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-6 text-[10px] px-2 gap-1"
                      onClick={() => setShowLogoutConfirm(true)}
                      disabled={logoutLoading}
                    >
                      {logoutLoading ? <RefreshCw className="h-2.5 w-2.5 animate-spin" /> : <WifiOff className="h-2.5 w-2.5" />}
                      Force Logout
                    </Button>
                  )}

                  {/* Force Logout Confirmation */}
                  {showLogoutConfirm && (
                    <div className="mt-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-2">
                      <p className="text-xs text-destructive font-medium">⚠️ Are you sure you want to force logout {workerId}?</p>
                      <p className="text-[10px] text-muted-foreground">This will terminate all their active sessions. They will be disconnected within 1 minute.</p>
                      <div className="flex gap-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-6 text-[10px] px-3"
                          onClick={handleForceLogout}
                          disabled={logoutLoading}
                        >
                          {logoutLoading ? <RefreshCw className="h-2.5 w-2.5 animate-spin" /> : null}
                          Yes, Force Logout
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 text-[10px] px-3"
                          onClick={() => setShowLogoutConfirm(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {data.has_pin ? (
                    <Badge variant="secondary" className="text-[10px] gap-0.5"><Lock className="h-2.5 w-2.5" />PIN Set {data.pin_created ? `- ${new Date(data.pin_created).toLocaleDateString()}` : ''}</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] gap-0.5"><Unlock className="h-2.5 w-2.5" />No PIN</Badge>
                  )}
                  {data.identity_confirmed ? (
                    <Badge variant="secondary" className="text-[10px] gap-0.5 bg-green-500/10 text-green-700 dark:text-green-400"><UserCheck className="h-2.5 w-2.5" />Confirmed {data.identity_confirmed_at ? `- ${new Date(data.identity_confirmed_at).toLocaleDateString()}` : ''}</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] gap-0.5 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700"><AlertTriangle className="h-2.5 w-2.5" />Not Confirmed</Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Earnings Breakdown by Cycle */}
            <Card>
              <CardHeader className="py-2.5 px-3">
                <CardTitle className="text-xs flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5" />Earnings Breakdown ({totalCycles} cycles)</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                {data.earnings_by_cycle?.length > 0 ? (
                  <div className="space-y-2">
                    {data.earnings_by_cycle.map((c: any) => {
                      const isExpanded = expandedCycle === c.cycle_key;
                      const cyclePercent = data.grand_total > 0 ? ((c.total / data.grand_total) * 100).toFixed(1) : '0';
                      return (
                        <div key={c.cycle_key} className="border rounded-lg overflow-hidden">
                          <button
                            onClick={() => setExpandedCycle(isExpanded ? null : c.cycle_key)}
                            className="w-full flex items-center justify-between p-2.5 hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex flex-col items-start gap-0.5">
                              <span className="text-xs font-medium">{formatCycleLabel(c.cycle_key)}</span>
                              <span className="text-[10px] text-muted-foreground">{c.sheets.length} sheet{c.sheets.length !== 1 ? 's' : ''} - {cyclePercent}% of total</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold font-mono">{formatNaira(c.total)}</span>
                              <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </div>
                          </button>
                          {isExpanded && (
                            <div className="border-t bg-muted/20 px-3 py-2 space-y-1.5">
                              {c.sheets.map((s: any, i: number) => (
                                <div key={i}>
                                  <div className="flex justify-between items-center text-xs py-1">
                                    <span className="truncate max-w-[200px] font-medium">{s.sheet}</span>
                                    <span className="font-mono font-semibold">{formatNaira(s.amount)}</span>
                                  </div>
                                  {/* Progress bar for sheet contribution */}
                                  <div className="h-1 rounded-full bg-muted overflow-hidden">
                                    <div
                                      className="h-full rounded-full bg-primary/60"
                                      style={{ width: `${c.total > 0 ? Math.max(2, (s.amount / c.total) * 100) : 0}%` }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">No cached earnings data</p>
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
                  <div className="space-y-0.5">
                    {data.sessions.slice(0, 15).map((s: any, i: number) => {
                      const isActive = (Date.now() - new Date(s.last_heartbeat).getTime()) < 15 * 60 * 1000;
                      const sessionDuration = new Date(s.last_heartbeat).getTime() - new Date(s.created_at).getTime();
                      const durationStr = sessionDuration > 3600000
                        ? `${Math.floor(sessionDuration / 3600000)}h ${Math.floor((sessionDuration % 3600000) / 60000)}m`
                        : sessionDuration > 60000
                        ? `${Math.floor(sessionDuration / 60000)}m`
                        : '<1m';
                      return (
                        <div key={i} className="flex items-center justify-between text-[11px] py-2 px-2 rounded hover:bg-muted/50 border-b border-border/30 last:border-0">
                          <div className="flex items-center gap-2">
                            {isActive ? <Wifi className="h-2.5 w-2.5 text-emerald-500" /> : <WifiOff className="h-2.5 w-2.5 text-muted-foreground" />}
                            <div className="flex flex-col">
                              <span className="font-mono text-muted-foreground">{s.device_fingerprint?.substring(0, 12)}...</span>
                              <span className="text-[10px] text-muted-foreground/70">Duration: {durationStr}</span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-muted-foreground">{formatTime(s.created_at)}</span>
                            {isActive && <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium">ONLINE</span>}
                          </div>
                        </div>
                      );
                    })}
                    {data.sessions.length > 15 && (
                      <p className="text-[10px] text-muted-foreground text-center pt-2">
                        +{data.sessions.length - 15} more sessions
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">No session history</p>
                )}
              </CardContent>
            </Card>
          </div>
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
              <Card
                key={w.worker_id}
                className="p-3 cursor-pointer hover:ring-1 hover:ring-primary/30 hover:bg-muted/30 transition-all active:scale-[0.99]"
                onClick={() => setSelectedWorker(w.worker_id)}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold">
                      {w.worker_id.substring(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <span className="text-sm font-medium truncate text-primary block">
                        {w.worker_id}
                      </span>
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
                      onClick={(e) => { e.stopPropagation(); handleResetPin(w.worker_id); }}
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
  const [loadError, setLoadError] = useState(false);
  const [expandedSheet, setExpandedSheet] = useState<string | null>(null);
  const [selectedWorkerFromEarnings, setSelectedWorkerFromEarnings] = useState<string | null>(null);

  // Use proper 16th-to-15th cycle options (memoized once)
  const cycleOptions = useMemo(() => getCycleOptions(8), []);
  // Store selected index to avoid object-reference instability
  const [selectedCycleIdx, setSelectedCycleIdx] = useState(0);
  const selectedCycle = cycleOptions[selectedCycleIdx];
  const selectedCycleKey = getCycleKey(selectedCycle);
  const [showCycleDropdown, setShowCycleDropdown] = useState(false);

  // Sheet filter uses sheets returned from the API response (no separate hook needed)
  const [selectedSheetFilter, setSelectedSheetFilter] = useState<string | null>(null);
  const [showSheetDropdown, setShowSheetDropdown] = useState(false);

  const load = useCallback(async (cycleKey: string) => {
    setLoadError(false);
    const res = await adminRequest(adminSecret, 'get_earnings_overview', { cycle_key: cycleKey });
    if (res) {
      setData(res);
    } else {
      setLoadError(true);
    }
  }, [adminRequest, adminSecret]);

  // Load data when cycle changes (use string key as dep for stability)
  useEffect(() => { load(selectedCycleKey); }, [load, selectedCycleKey]);

  const handleCycleChange = (idx: number) => {
    setSelectedCycleIdx(idx);
    setShowCycleDropdown(false);
    setExpandedSheet(null);
    setSelectedSheetFilter(null);
  };

  // Sheet names from the API response data
  const sheetNames = useMemo(() => {
    if (!data?.by_sheet) return [];
    return data.by_sheet.map((s: any) => s.sheet as string);
  }, [data]);

  // Filter top earners and by_sheet by selected sheet
  const filteredBySheet = selectedSheetFilter
    ? data?.by_sheet?.filter((s: any) => s.sheet === selectedSheetFilter) || []
    : data?.by_sheet || [];

  // Recalculate top earners based on filtered sheets
  const filteredTopEarners = useMemo(() => {
    if (!data) return [];
    if (!selectedSheetFilter) return data.top_earners || [];
    const sheetData = data.by_sheet?.find((s: any) => s.sheet === selectedSheetFilter);
    if (!sheetData?.workers) return [];
    return sheetData.workers
      .map((w: any) => ({ worker_id: w.worker_id, total: w.amount }))
      .sort((a: any, b: any) => b.total - a.total)
      .slice(0, 20);
  }, [data, selectedSheetFilter]);

  const grandTotal = filteredTopEarners?.reduce((sum: number, e: any) => sum + e.total, 0) || 0;

  // Loading state (no data yet and no error)
  if (!data && !loadError) return <div className="flex items-center justify-center py-12"><RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      {/* Cycle filter - Proper 16th-to-15th */}
      <div className="relative">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-between text-xs"
          onClick={() => { setShowCycleDropdown(!showCycleDropdown); setShowSheetDropdown(false); }}
        >
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            <span>{selectedCycle.label}</span>
          </div>
          <ChevronDown className={`h-3 w-3 ml-1 opacity-50 transition-transform ${showCycleDropdown ? 'rotate-180' : ''}`} />
        </Button>
        {showCycleDropdown && (
          <Card className="absolute top-full left-0 right-0 mt-1 z-50 shadow-lg">
            <div className="py-1 max-h-[250px] overflow-y-auto">
              {cycleOptions.map((cycle, idx) => {
                const key = getCycleKey(cycle);
                const isSelected = selectedCycleKey === key;
                return (
                  <button
                    key={key}
                    onClick={() => handleCycleChange(idx)}
                    className={`w-full text-left px-3 py-2.5 text-xs hover:bg-muted/50 flex items-center justify-between ${isSelected ? 'bg-accent font-medium' : ''}`}
                  >
                    <span>{cycle.label}</span>
                    {idx === 0 && <Badge variant="secondary" className="text-[9px] h-4">Current</Badge>}
                  </button>
                );
              })}
            </div>
          </Card>
        )}
      </div>

      {/* Sheet filter - uses sheets from the API response */}
      {sheetNames.length > 0 && (
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-between text-xs"
            onClick={() => { setShowSheetDropdown(!showSheetDropdown); setShowCycleDropdown(false); }}
          >
            <div className="flex items-center gap-1.5">
              <Eye className="h-3 w-3 text-muted-foreground" />
              <span className="truncate">{selectedSheetFilter || 'All Sheets'}</span>
            </div>
            <ChevronDown className={`h-3 w-3 ml-1 opacity-50 transition-transform ${showSheetDropdown ? 'rotate-180' : ''}`} />
          </Button>
          {showSheetDropdown && (
            <Card className="absolute top-full left-0 right-0 mt-1 z-50 shadow-lg">
              <div className="py-1 max-h-[200px] overflow-y-auto">
                <button
                  onClick={() => { setSelectedSheetFilter(null); setShowSheetDropdown(false); }}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-muted/50 ${!selectedSheetFilter ? 'bg-accent font-medium' : ''}`}
                >
                  All Sheets
                </button>
                {sheetNames.map((name: string) => (
                  <button
                    key={name}
                    onClick={() => { setSelectedSheetFilter(name); setShowSheetDropdown(false); }}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-muted/50 truncate ${selectedSheetFilter === name ? 'bg-accent font-medium' : ''}`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Error state */}
      {loadError && !data && (
        <div className="text-center py-8 space-y-3">
          <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">Failed to load earnings data for this cycle</p>
          <Button variant="outline" size="sm" onClick={() => load(selectedCycleKey)}>
            <RefreshCw className="h-3 w-3 mr-1.5" />
            Retry
          </Button>
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Cached Records" value={data.total_records} icon={Database} />
            <StatCard label="Cycle Total" value={formatNaira(grandTotal)} icon={TrendingUp} />
          </div>

          {/* Top Earners */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4" />Top 20 Earners
                <Badge variant="outline" className="text-[10px] ml-1">{selectedCycle.shortLabel}</Badge>
                {selectedSheetFilter && <Badge variant="secondary" className="text-[10px]">{selectedSheetFilter}</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <ScrollArea className="h-[200px]">
                <div className="space-y-1">
                  {filteredTopEarners?.map((e: any, i: number) => (
                    <button
                      key={e.worker_id}
                      onClick={() => setSelectedWorkerFromEarnings(e.worker_id)}
                      className="w-full flex items-center justify-between text-sm p-2.5 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`text-xs w-5 font-bold ${i < 3 ? 'text-primary' : 'text-muted-foreground'}`}>{i + 1}.</span>
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                          {e.worker_id.substring(0, 2)}
                        </div>
                        <span className="font-medium text-sm">{e.worker_id}</span>
                      </div>
                      <span className="font-mono text-xs font-semibold">{formatNaira(e.total)}</span>
                    </button>
                  ))}
                  {(!filteredTopEarners || filteredTopEarners.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-4">No earnings data for this cycle{selectedSheetFilter ? ' and sheet' : ''}</p>
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
                  {filteredBySheet?.map((s: any) => (
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
                            <button
                              key={i}
                              onClick={() => setSelectedWorkerFromEarnings(w.worker_id)}
                              className="w-full flex justify-between text-[11px] text-muted-foreground pl-2 py-1 hover:bg-muted/30 rounded transition-colors"
                            >
                              <span>{w.worker_id}</span>
                              <span>{formatNaira(w.amount)}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {filteredBySheet?.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No sheet data for this cycle</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Button variant="outline" size="sm" onClick={() => load(selectedCycleKey)} disabled={isLoading}>
            <RefreshCw className={`h-3 w-3 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </>
      )}

      {/* Worker detail modal from earnings tab */}
      <WorkerDetailModal
        workerId={selectedWorkerFromEarnings}
        adminSecret={adminSecret}
        open={!!selectedWorkerFromEarnings}
        onClose={() => setSelectedWorkerFromEarnings(null)}
      />
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

// ─── Feedback Tab ───────────────────────────────────────────
function FeedbackTab({ adminSecret }: { adminSecret: string }) {
  const { adminRequest, isLoading } = useAdminData();
  const [data, setData] = useState<any>(null);

  const load = useCallback(async () => {
    const res = await adminRequest(adminSecret, 'get_feedback');
    if (res) setData(res);
  }, [adminRequest, adminSecret]);

  useEffect(() => { load(); }, [load]);

  if (!data) return <div className="flex items-center justify-center py-12"><RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  const yesPercent = data.total > 0 ? ((data.yes_count / data.total) * 100).toFixed(1) : '0';
  const noPercent = data.total > 0 ? ((data.no_count / data.total) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total Responses" value={data.total} icon={MessageSquare} />
        <StatCard label="Yes" value={data.yes_count} icon={ThumbsUp} />
        <StatCard label="No" value={data.no_count} icon={ThumbsDown} />
      </div>

      {/* Ratio Bar */}
      {data.total > 0 && (
        <Card>
          <CardContent className="pt-4 px-4 pb-4 space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Yes ({yesPercent}%)</span>
              <span>No ({noPercent}%)</span>
            </div>
            <div className="h-3 rounded-full bg-muted overflow-hidden flex">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${yesPercent}%` }}
              />
              <div
                className="h-full bg-red-400 transition-all"
                style={{ width: `${noPercent}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Responses List */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <MessageSquare className="h-4 w-4" />All Responses
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          {data.responses?.length > 0 ? (
            <ScrollArea className="h-[350px]">
              <div className="space-y-1">
                {[...data.responses].reverse().map((r: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/50 border-b border-border/30 last:border-0">
                    <div className="flex items-center gap-2.5">
                      <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${r.answer === 'yes' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                        {r.answer === 'yes'
                          ? <ThumbsUp className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                          : <ThumbsDown className="h-3 w-3 text-red-500 dark:text-red-400" />
                        }
                      </div>
                      <div className="min-w-0">
                        <span className="text-sm font-medium font-mono">{r.worker_id}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={`text-[10px] h-5 ${r.answer === 'yes' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}
                      >
                        {r.answer === 'yes' ? 'Yes' : 'No'}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {r.timestamp ? new Date(r.timestamp).toLocaleDateString() : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No feedback responses yet</p>
          )}
        </CardContent>
      </Card>

      <Button variant="outline" size="sm" onClick={load} disabled={isLoading}>
        <RefreshCw className={`h-3 w-3 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
        Refresh
      </Button>
    </div>
  );
}

// ─── PIN Reset Requests Tab ──────────────────────────────────
function PinResetRequestsTab({ adminSecret }: { adminSecret: string }) {
  const { adminRequest, isLoading } = useAdminData();
  const [data, setData] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await adminRequest(adminSecret, 'get_pin_reset_requests');
    if (res) setData(res);
  }, [adminRequest, adminSecret]);

  useEffect(() => { load(); }, [load]);

  const handleAction = async (requestId: string, actionType: 'approve' | 'deny') => {
    setActionLoading(requestId);
    const res = await adminRequest(adminSecret, 'resolve_pin_reset_request', { 
      request_id: requestId, 
      action_type: actionType 
    });
    if (res?.success) {
      toast.success(res.message || `Request ${actionType}d`);
      load();
    } else {
      toast.error(res?.error || 'Failed');
    }
    setActionLoading(null);
  };

  if (!data) return <div className="flex items-center justify-center py-12"><RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  const pending = data.requests?.filter((r: any) => r.status === 'pending') || [];
  const resolved = data.requests?.filter((r: any) => r.status !== 'pending') || [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Pending" value={data.pending_count || 0} icon={AlertCircle} />
        <StatCard label="Resolved" value={data.resolved_count || 0} icon={CheckCircle2} />
      </div>

      {/* Pending Requests */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            Pending Requests ({pending.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No pending requests</p>
          ) : (
            <div className="space-y-2">
              {pending.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
                  <div>
                    <p className="text-sm font-medium font-mono">{r.worker_id}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(r.requested_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => handleAction(r.id, 'approve')}
                      disabled={actionLoading === r.id}
                    >
                      {actionLoading === r.id ? <RefreshCw className="h-3 w-3 animate-spin" /> : 'Approve & Reset'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs text-destructive hover:text-destructive"
                      onClick={() => handleAction(r.id, 'deny')}
                      disabled={actionLoading === r.id}
                    >
                      Deny
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resolved History */}
      {resolved.length > 0 && (
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <History className="h-4 w-4" />
              Resolved ({resolved.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <ScrollArea className="h-[200px]">
              <div className="space-y-1">
                {resolved.map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between py-2 px-2 text-xs border-b border-border/30 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium">{r.worker_id}</span>
                      <Badge 
                        variant="secondary" 
                        className={`text-[10px] h-4 ${r.status === 'approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}
                      >
                        {r.status}
                      </Badge>
                    </div>
                    <span className="text-muted-foreground">
                      {r.resolved_at ? new Date(r.resolved_at).toLocaleDateString() : ''}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      <Button variant="outline" size="sm" onClick={load} disabled={isLoading}>
        <RefreshCw className={`h-3 w-3 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
        Refresh
      </Button>
    </div>
  );
}

// ─── Notification Dot Hook ────────────────────────────────────
function useTabNotifications(adminSecret: string | null) {
  const [dots, setDots] = useState<Record<string, boolean>>({
    'pin-requests': false,
    'activity': false,
    'feedback': false,
  });
  const { adminRequest } = useAdminData();

  // Check for new content on mount and periodically
  useEffect(() => {
    if (!adminSecret) return;

    const checkNew = async () => {
      const newDots: Record<string, boolean> = { 'pin-requests': false, activity: false, feedback: false };

      // Check PIN reset requests
      const pinRes = await adminRequest(adminSecret, 'get_pin_reset_requests');
      if (pinRes?.requests?.length) {
        const lastViewed = localStorage.getItem('admin_tab_last_viewed_pin-requests') || '0';
        const hasNew = pinRes.requests.some((r: any) => 
          new Date(r.requested_at).getTime() > parseInt(lastViewed)
        );
        newDots['pin-requests'] = hasNew;
      }

      // Check activity
      const actRes = await adminRequest(adminSecret, 'get_activity');
      if (actRes) {
        const lastViewed = localStorage.getItem('admin_tab_last_viewed_activity') || '0';
        const allTimes = [
          ...(actRes.recent_pins?.map((p: any) => new Date(p.created_at).getTime()) || []),
          ...(actRes.recent_identities?.map((i: any) => new Date(i.confirmed_at).getTime()) || []),
          ...(actRes.recent_sessions?.map((s: any) => new Date(s.created_at).getTime()) || []),
        ];
        const latestTime = Math.max(0, ...allTimes);
        newDots['activity'] = latestTime > parseInt(lastViewed);
      }

      // Check feedback
      const fbRes = await adminRequest(adminSecret, 'get_feedback');
      if (fbRes?.responses?.length) {
        const lastViewed = localStorage.getItem('admin_tab_last_viewed_feedback') || '0';
        const hasNew = fbRes.responses.some((r: any) => 
          new Date(r.created_at || r.submitted_at || 0).getTime() > parseInt(lastViewed)
        );
        newDots['feedback'] = hasNew;
      }

      setDots(newDots);
    };

    checkNew();
  }, [adminSecret, adminRequest]);

  const markViewed = useCallback((tab: string) => {
    localStorage.setItem(`admin_tab_last_viewed_${tab}`, Date.now().toString());
    setDots(prev => ({ ...prev, [tab]: false }));
  }, []);

  return { dots, markViewed };
}

// ─── Main Admin Page ─────────────────────────────────────────
export default function AdminPinReset() {
  const [adminSecret, setAdminSecret] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);
  const { adminRequest } = useAdminData();
  const { dots, markViewed } = useTabNotifications(adminSecret);
  const { theme, accentColor, setTheme, setAccentColor } = useTheme();

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
    return (
      <AdminLogin
        onAuth={handleAuth}
        theme={theme}
        accentColor={accentColor}
        onThemeChange={setTheme}
        onAccentChange={setAccentColor}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
      <header className="sticky top-0 z-50 border-b bg-background/85 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center">
              <Shield className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Admin Control Center</p>
              <p className="text-xs text-muted-foreground">Manage workers, security, and operations</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeSwitcher
              theme={theme}
              accentColor={accentColor}
              onThemeChange={setTheme}
              onAccentChange={setAccentColor}
            />
            <Badge variant="secondary" className="hidden text-xs gap-1 sm:flex">
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

      <main className="container mx-auto max-w-5xl px-4 py-5 sm:py-8">
        <Tabs defaultValue="workers" className="space-y-5" onValueChange={(val) => {
          if (dots[val]) markViewed(val);
        }}>
          <Card className="border-primary/15 bg-card/80 shadow-sm">
            <CardContent className="p-2">
              <TabsList className="flex h-10 w-full gap-1 overflow-x-auto overflow-y-hidden bg-transparent p-0 scrollbar-none">
            <TabsTrigger value="workers" className="text-xs gap-0.5 px-2 shrink-0">
              <Users className="h-3 w-3" />
              <span className="hidden sm:inline">Workers</span>
            </TabsTrigger>
            <TabsTrigger value="pin-requests" className="text-xs gap-0.5 px-2 shrink-0 relative">
              <KeyRound className="h-3 w-3" />
              <span className="hidden sm:inline">PINs</span>
              {dots['pin-requests'] && (
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-destructive" />
              )}
            </TabsTrigger>
            <TabsTrigger value="earnings" className="text-xs gap-0.5 px-2 shrink-0">
              <TrendingUp className="h-3 w-3" />
              <span className="hidden sm:inline">Earnings</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="text-xs gap-0.5 px-2 shrink-0">
              <ClipboardList className="h-3 w-3" />
              <span className="hidden sm:inline">Reports</span>
            </TabsTrigger>
            <TabsTrigger value="stage-totals" className="text-xs gap-0.5 px-2 shrink-0">
              <BarChart3 className="h-3 w-3" />
              <span className="hidden sm:inline">Stage Totals</span>
            </TabsTrigger>
            <TabsTrigger value="swaps" className="text-xs gap-0.5 px-2 shrink-0">
              <ArrowLeftRight className="h-3 w-3" />
              <span className="hidden sm:inline">Swaps</span>
            </TabsTrigger>
            <TabsTrigger value="notes" className="text-xs gap-0.5 px-2 shrink-0">
              <StickyNote className="h-3 w-3" />
              <span className="hidden sm:inline">Notes</span>
            </TabsTrigger>
            <TabsTrigger value="cache" className="text-xs gap-0.5 px-2 shrink-0">
              <Database className="h-3 w-3" />
              <span className="hidden sm:inline">Cache</span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="text-xs gap-0.5 px-2 shrink-0 relative">
              <Activity className="h-3 w-3" />
              <span className="hidden sm:inline">Activity</span>
              {dots['activity'] && (
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-destructive" />
              )}
            </TabsTrigger>
            <TabsTrigger value="audit" className="text-xs gap-0.5 px-2 shrink-0">
              <FileText className="h-3 w-3" />
              <span className="hidden sm:inline">Audit</span>
            </TabsTrigger>
            <TabsTrigger value="feedback" className="text-xs gap-0.5 px-2 shrink-0 relative">
              <MessageSquare className="h-3 w-3" />
              <span className="hidden sm:inline">Feedback</span>
              {dots['feedback'] && (
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-destructive" />
              )}
            </TabsTrigger>
            <TabsTrigger value="alerts" className="text-xs gap-0.5 px-2 shrink-0">
              <Bell className="h-3 w-3" />
              <span className="hidden sm:inline">Alerts</span>
            </TabsTrigger>
            <TabsTrigger value="intro" className="text-xs gap-0.5 px-2 shrink-0">
              <Sparkles className="h-3 w-3" />
              <span className="hidden sm:inline">Intro</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-xs gap-0.5 px-2 shrink-0">
              <Settings className="h-3 w-3" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
              </TabsList>
            </CardContent>
          </Card>

          <TabsContent value="workers">
            <WorkersTab adminSecret={adminSecret} />
          </TabsContent>
          <TabsContent value="pin-requests">
            <PinResetRequestsTab adminSecret={adminSecret} />
          </TabsContent>
          <TabsContent value="earnings">
            <EarningsTab adminSecret={adminSecret} />
          </TabsContent>
          <TabsContent value="reports">
            <CycleReportTab adminSecret={adminSecret} />
          </TabsContent>
          <TabsContent value="stage-totals">
            <StageTotalsTab adminSecret={adminSecret} />
          </TabsContent>
          <TabsContent value="swaps">
            <SwapsTransfersTab adminSecret={adminSecret} />
          </TabsContent>
          <TabsContent value="notes">
            <WorkerNotesTab adminSecret={adminSecret} />
          </TabsContent>
          <TabsContent value="cache">
            <CacheTab adminSecret={adminSecret} />
          </TabsContent>
          <TabsContent value="activity">
            <ActivityTab adminSecret={adminSecret} />
          </TabsContent>
          <TabsContent value="audit">
            <AuditLogTab adminSecret={adminSecret} />
          </TabsContent>
          <TabsContent value="feedback">
            <FeedbackTab adminSecret={adminSecret} />
          </TabsContent>
          <TabsContent value="alerts">
            <AlertsTab adminSecret={adminSecret} />
          </TabsContent>
          <TabsContent value="intro">
            <IntroAnimationTab adminSecret={adminSecret} />
          </TabsContent>
          <TabsContent value="settings">
            <SettingsTab adminSecret={adminSecret} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
