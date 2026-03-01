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
      
      if (data) setAlerts(data as unknown as AdminAlert[]);
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

  const styleMap: Record<string, { bg: string; border: string; text: string; iconColor: string; accent: string }> = {
    info: {
      bg: 'bg-primary/5 dark:bg-primary/10',
      border: 'border-primary/20 dark:border-primary/30',
      text: 'text-primary dark:text-primary',
      iconColor: 'text-primary',
      accent: 'bg-primary',
    },
    warning: {
      bg: 'bg-destructive/5 dark:bg-destructive/10',
      border: 'border-destructive/20 dark:border-destructive/30',
      text: 'text-destructive dark:text-destructive',
      iconColor: 'text-destructive',
      accent: 'bg-destructive',
    },
    error: {
      bg: 'bg-destructive/5 dark:bg-destructive/10',
      border: 'border-destructive/20 dark:border-destructive/30',
      text: 'text-destructive dark:text-destructive',
      iconColor: 'text-destructive',
      accent: 'bg-destructive',
    },
    success: {
      bg: 'bg-accent/10 dark:bg-accent/15',
      border: 'border-accent/30 dark:border-accent/40',
      text: 'text-accent-foreground dark:text-accent-foreground',
      iconColor: 'text-accent-foreground',
      accent: 'bg-accent',
    },
  };

  return (
    <div className="sticky top-0 z-40 w-full space-y-0">
      {visibleAlerts.map((alert) => {
        const Icon = iconMap[alert.alert_type] || Info;
        const style = styleMap[alert.alert_type] || styleMap.info;

        return (
          <div
            key={alert.id}
            className={cn(
              'relative w-full border-b px-4 py-2.5 animate-in slide-in-from-top-2 duration-300',
              style.bg,
              style.border,
            )}
          >
            {/* Accent line at top */}
            <div className={cn('absolute inset-x-0 top-0 h-0.5', style.accent)} />
            
            <div className="flex items-center justify-center gap-3 max-w-3xl mx-auto">
              <Icon className={cn('h-4 w-4 shrink-0', style.iconColor)} />
              <div className="flex items-center gap-2 text-center min-w-0">
                <span className={cn('text-sm font-semibold', style.text)}>
                  {alert.title}
                </span>
                {alert.message && (
                  <>
                    <span className="text-muted-foreground/40">·</span>
                    <span className={cn('text-xs opacity-80', style.text)}>
                      {alert.message}
                    </span>
                  </>
                )}
              </div>
              <button
                onClick={() => handleDismiss(alert.id)}
                className="text-muted-foreground hover:text-foreground shrink-0 transition-colors p-1 rounded-md hover:bg-muted/50"
                aria-label="Dismiss alert"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
