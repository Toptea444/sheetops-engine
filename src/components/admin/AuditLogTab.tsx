import { useState, useCallback, useEffect } from 'react';
import {
  History, RefreshCw, Clock, ArrowLeftRight, Trash2, Bell, Lock,
  WifiOff, Settings, FileText, StickyNote, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAdminData } from '@/hooks/useAdminData';

interface Props {
  adminSecret: string;
}

const ACTION_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  create_swap: { label: 'Created Swap', icon: ArrowLeftRight, color: 'text-blue-500' },
  delete_swap: { label: 'Deleted Swap', icon: Trash2, color: 'text-red-500' },
  create_transfer: { label: 'Created Transfer', icon: ArrowLeftRight, color: 'text-emerald-500' },
  delete_transfer: { label: 'Deleted Transfer', icon: Trash2, color: 'text-red-500' },
  reset_pin: { label: 'Reset PIN', icon: Lock, color: 'text-amber-500' },
  approve_pin_reset: { label: 'Approved PIN Reset', icon: Lock, color: 'text-green-500' },
  deny_pin_reset: { label: 'Denied PIN Reset', icon: Lock, color: 'text-red-500' },
  create_alert: { label: 'Created Alert', icon: Bell, color: 'text-blue-500' },
  delete_alert: { label: 'Deleted Alert', icon: Trash2, color: 'text-red-500' },
  toggle_alert: { label: 'Toggled Alert', icon: Bell, color: 'text-amber-500' },
  toggle_site_restriction: { label: 'Toggled Restriction', icon: Settings, color: 'text-purple-500' },
  clear_cache: { label: 'Cleared Cache', icon: Trash2, color: 'text-orange-500' },
  force_logout: { label: 'Force Logout', icon: WifiOff, color: 'text-red-500' },
  create_worker_note: { label: 'Added Note', icon: StickyNote, color: 'text-blue-500' },
  update_worker_note: { label: 'Updated Note', icon: StickyNote, color: 'text-amber-500' },
  delete_worker_note: { label: 'Deleted Note', icon: Trash2, color: 'text-red-500' },
};

export function AuditLogTab({ adminSecret }: Props) {
  const { adminRequest, isLoading } = useAdminData();
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await adminRequest(adminSecret, 'get_audit_logs', { limit: 100 });
    if (res) {
      setLogs(res.logs || []);
      setTotal(res.total || 0);
    }
  }, [adminRequest, adminSecret]);

  useEffect(() => { load(); }, [load]);

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    const now = Date.now();
    const diff = now - d.getTime();
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!logs.length && isLoading) {
    return <div className="flex items-center justify-center py-12"><RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{total} total actions logged</p>
        <Button variant="outline" size="sm" onClick={load} disabled={isLoading}>
          <RefreshCw className={`h-3 w-3 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />Refresh
        </Button>
      </div>

      <ScrollArea className="h-[500px]">
        <div className="space-y-1.5">
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No audit logs yet. Actions will appear here as you use admin features.</p>
          ) : logs.map((log) => {
            const meta = ACTION_META[log.action] || { label: log.action, icon: FileText, color: 'text-muted-foreground' };
            const Icon = meta.icon;
            const isExpanded = expandedId === log.id;
            const details = log.details && Object.keys(log.details).length > 0 ? log.details : null;

            return (
              <Card key={log.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <button
                    onClick={() => details && setExpandedId(isExpanded ? null : log.id)}
                    className="w-full flex items-center gap-3 py-2.5 px-3 hover:bg-muted/30 transition-colors text-left"
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${meta.color}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{meta.label}</p>
                      {log.target_id && (
                        <p className="text-[10px] text-muted-foreground font-mono truncate">
                          {log.target_type}: {log.target_id.substring(0, 12)}...
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5" />{formatTime(log.created_at)}
                      </span>
                      {details && (
                        isExpanded ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                  </button>
                  {isExpanded && details && (
                    <div className="border-t bg-muted/20 px-3 py-2">
                      <div className="space-y-1">
                        {Object.entries(details).map(([key, value]) => (
                          <div key={key} className="flex justify-between text-xs">
                            <span className="text-muted-foreground">{key.replace(/_/g, ' ')}</span>
                            <span className="font-mono font-medium text-foreground">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
