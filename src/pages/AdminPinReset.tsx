import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield, KeyRound, AlertTriangle, CheckCircle2, ArrowLeft,
  Users, BarChart3, Database, Activity, Lock, Unlock, RefreshCw,
  Trash2, Search, UserCheck, Wifi, WifiOff, Clock, TrendingUp,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAdminData } from '@/hooks/useAdminData';
import { toast } from 'sonner';

// ─── Admin Auth Gate ─────────────────────────────────────────
function AdminLogin({ onAuth }: { onAuth: (secret: string) => void }) {
  const [secret, setSecret] = useState('');

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
              onKeyDown={(e) => e.key === 'Enter' && secret && onAuth(secret)}
              className="pl-10"
            />
          </div>
          <Button className="w-full" disabled={!secret} onClick={() => onAuth(secret)}>
            Unlock
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
function StatCard({ label, value, icon: Icon, sub }: { label: string; value: string | number; icon: React.ElementType; sub?: string }) {
  return (
    <Card>
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

// ─── Workers Tab ─────────────────────────────────────────────
function WorkersTab({ adminSecret }: { adminSecret: string }) {
  const { adminRequest, isLoading } = useAdminData();
  const [data, setData] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [resetLoading, setResetLoading] = useState<string | null>(null);

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

  const filtered = data.workers?.filter((w: any) =>
    w.worker_id.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Workers" value={data.total_workers} icon={Users} />
        <StatCard label="With PIN" value={data.total_with_pins} icon={Lock} />
        <StatCard label="Confirmed" value={data.total_confirmed} icon={UserCheck} />
        <StatCard label="Active Now" value={data.total_active_sessions} icon={Wifi} />
      </div>

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
            const isOnline = w.sessions?.some((s: any) => (Date.now() - new Date(s.last_heartbeat).getTime()) < 15 * 60 * 1000);
            return (
              <Card key={w.worker_id} className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold">
                      {w.worker_id.substring(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{w.worker_id}</p>
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
            <p className="text-sm text-muted-foreground text-center py-8">No workers found</p>
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

// ─── Analytics Tab ───────────────────────────────────────────
function AnalyticsTab({ adminSecret }: { adminSecret: string }) {
  const { adminRequest, isLoading } = useAdminData();
  const [data, setData] = useState<any>(null);

  const load = useCallback(async () => {
    const res = await adminRequest(adminSecret, 'get_earnings_overview');
    if (res) setData(res);
  }, [adminRequest, adminSecret]);

  useEffect(() => { load(); }, [load]);

  if (!data) return <div className="flex items-center justify-center py-12"><RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  const grandTotal = data.top_earners?.reduce((sum: number, e: any) => sum + e.total, 0) || 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Cached Records" value={data.total_records} icon={Database} />
        <StatCard label="Grand Total" value={`$${grandTotal.toFixed(2)}`} icon={TrendingUp} />
      </div>

      {/* Top Earners */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm flex items-center gap-1.5"><TrendingUp className="h-4 w-4" />Top Earners</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <ScrollArea className="h-[200px]">
            <div className="space-y-1.5">
              {data.top_earners?.map((e: any, i: number) => (
                <div key={e.worker_id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                    <span className="font-medium">{e.worker_id}</span>
                  </div>
                  <span className="font-mono text-xs">${e.total.toFixed(2)}</span>
                </div>
              ))}
              {(!data.top_earners || data.top_earners.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">No earnings data cached yet</p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* By Sheet */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm flex items-center gap-1.5"><Eye className="h-4 w-4" />Earnings by Sheet</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <div className="space-y-1.5">
            {data.by_sheet?.map((s: any) => (
              <div key={s.sheet} className="flex items-center justify-between text-sm">
                <span className="truncate max-w-[200px]">{s.sheet}</span>
                <span className="font-mono text-xs">${s.total.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Button variant="outline" size="sm" onClick={load} disabled={isLoading}>
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

// ─── Main Admin Page ─────────────────────────────────────────
export default function AdminPinReset() {
  const [adminSecret, setAdminSecret] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);
  const { adminRequest } = useAdminData();

  const handleAuth = async (secret: string) => {
    setAuthError(false);
    // Verify the secret by making a lightweight request
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
      {/* Header */}
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

      {/* Content */}
      <main className="container mx-auto px-4 py-4 max-w-2xl">
        <Tabs defaultValue="workers" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 h-9">
            <TabsTrigger value="workers" className="text-xs gap-1">
              <Users className="h-3 w-3" />
              <span className="hidden sm:inline">Workers</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs gap-1">
              <BarChart3 className="h-3 w-3" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="cache" className="text-xs gap-1">
              <Database className="h-3 w-3" />
              <span className="hidden sm:inline">Cache</span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="text-xs gap-1">
              <Activity className="h-3 w-3" />
              <span className="hidden sm:inline">Activity</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="workers">
            <WorkersTab adminSecret={adminSecret} />
          </TabsContent>
          <TabsContent value="analytics">
            <AnalyticsTab adminSecret={adminSecret} />
          </TabsContent>
          <TabsContent value="cache">
            <CacheTab adminSecret={adminSecret} />
          </TabsContent>
          <TabsContent value="activity">
            <ActivityTab adminSecret={adminSecret} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
