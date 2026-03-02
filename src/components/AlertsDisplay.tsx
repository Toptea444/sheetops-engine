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
  const [animatingIds, setAnimatingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchAlerts = async () => {
      const { data } = await supabase
        .from('admin_alerts')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false });

      if (data) {
        const typed = data as unknown as AdminAlert[];
        setAlerts(typed);
        // Animate in new alerts
        setTimeout(() => {
          setAnimatingIds(new Set(typed.map(a => a.id)));
        }, 100);
      }
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleDismiss = (id: string) => {
    setAnimatingIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setTimeout(() => {
      setDismissedIds(prev => {
        const next = new Set(prev).add(id);
        localStorage.setItem('dismissed_alert_ids', JSON.stringify([...next]));
        return next;
      });
    }, 300);
  };

  const visibleAlerts = alerts.filter(a => !dismissedIds.has(a.id));

  if (visibleAlerts.length === 0) return null;

  const iconMap: Record<string, React.ElementType> = {
    info: Info,
    warning: AlertTriangle,
    error: AlertCircle,
    success: CheckCircle2,
  };

  const accentMap: Record<string, string> = {
    info: 'from-primary via-primary/60 to-transparent',
    warning: 'from-destructive via-destructive/60 to-transparent',
    error: 'from-destructive via-destructive/60 to-transparent',
    success: 'from-accent via-accent/60 to-transparent',
  };

  const iconColorMap: Record<string, string> = {
    info: 'text-primary',
    warning: 'text-destructive',
    error: 'text-destructive',
    success: 'text-accent-foreground',
  };

  const bgMap: Record<string, string> = {
    info: 'bg-primary/10',
    warning: 'bg-destructive/10',
    error: 'bg-destructive/10',
    success: 'bg-accent/10',
  };

  return (
    <>
      {visibleAlerts.map((alert, index) => {
        const Icon = iconMap[alert.alert_type] || Info;
        const accent = accentMap[alert.alert_type] || accentMap.info;
        const iconColor = iconColorMap[alert.alert_type] || iconColorMap.info;
        const bg = bgMap[alert.alert_type] || bgMap.info;
        const isAnimating = animatingIds.has(alert.id);

        return (
          <div
            key={alert.id}
            style={{ bottom: `${16 + index * 96}px` }}
            className={cn(
              'fixed left-4 z-50 max-w-xs transition-all duration-300 ease-out',
              isAnimating
                ? 'opacity-100 translate-x-0'
                : 'opacity-0 -translate-x-4'
            )}
          >
            <div className="bg-card border border-border rounded-xl shadow-lg overflow-hidden">
              <div className="relative px-4 py-3">
                <div className={cn('absolute inset-y-0 left-0 w-1 bg-gradient-to-b', accent)} />

                <button
                  onClick={() => handleDismiss(alert.id)}
                  className="absolute top-2 right-2 p-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  aria-label="Dismiss"
                >
                  <X className="h-4 w-4" />
                </button>

                <div className="flex items-start gap-3 pr-6 pl-1">
                  <div className={cn('flex-shrink-0 p-2 rounded-lg', bg)}>
                    <Icon className={cn('h-5 w-5', iconColor)} />
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium text-sm text-foreground">
                      {alert.title}
                    </p>
                    {alert.message && (
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {alert.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}