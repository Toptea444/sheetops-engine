import { useEffect, useState } from 'react';
import { AlertTriangle, AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface AdminAlert {
  id: string;
  title: string;
  message: string;
  alert_type: string;
  is_active: boolean;
  created_at: string;
}

export function AlertsDisplay() {
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('dismissed_alert_ids');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });

  useEffect(() => {
    const fetchAlerts = async () => {
      const { data } = await supabase
        .from('admin_alerts')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false });

      if (data) {
        setAlerts(data as unknown as AdminAlert[]);
      }
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleDismiss = (id: string) => {
    setDismissedIds(prev => {
      const next = new Set(prev).add(id);
      localStorage.setItem('dismissed_alert_ids', JSON.stringify([...next]));
      return next;
    });
  };

  const visibleAlerts = alerts.filter(a => !dismissedIds.has(a.id));

  if (visibleAlerts.length === 0) return null;

  const iconMap: Record<string, React.ElementType> = {
    info: Info,
    warning: AlertTriangle,
    error: AlertCircle,
    success: CheckCircle2,
  };

  const iconColorMap: Record<string, string> = {
    info: 'text-primary',
    warning: 'text-destructive',
    error: 'text-destructive',
    success: 'text-accent-foreground',
  };

  return (
    <div className="w-full flex flex-col items-center gap-2 pt-3 px-4">
      {visibleAlerts.map((alert) => {
        const Icon = iconMap[alert.alert_type] || Info;
        const iconColor = iconColorMap[alert.alert_type] || iconColorMap.info;

        return (
          <div
            key={alert.id}
            className="relative w-full max-w-sm bg-card border border-border rounded-xl shadow-lg px-4 py-3"
          >
            <button
              onClick={() => handleDismiss(alert.id)}
              className="absolute top-2 right-2 p-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex flex-col items-center text-center gap-1.5 pr-4">
              <div className="flex items-center gap-2">
                <Icon className={cn('h-4.5 w-4.5', iconColor)} />
                <p className="font-semibold text-sm text-foreground">
                  {alert.title}
                </p>
              </div>
              {alert.message && (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {alert.message}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
