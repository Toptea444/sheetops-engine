import { useEffect, useState } from 'react';
import { AlertTriangle, AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

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

  const styleMap: Record<string, { bg: string; border: string; text: string; iconColor: string }> = {
    info: {
      bg: 'bg-[hsl(210,60%,95%)] dark:bg-[hsl(210,40%,15%)]',
      border: 'border-[hsl(210,60%,80%)] dark:border-[hsl(210,40%,30%)]',
      text: 'text-[hsl(215,70%,30%)] dark:text-[hsl(210,60%,80%)]',
      iconColor: 'text-[hsl(215,70%,45%)] dark:text-[hsl(210,80%,65%)]',
    },
    warning: {
      bg: 'bg-[hsl(35,90%,95%)] dark:bg-[hsl(35,40%,12%)]',
      border: 'border-[hsl(35,80%,70%)] dark:border-[hsl(35,50%,30%)]',
      text: 'text-[hsl(25,80%,30%)] dark:text-[hsl(35,70%,75%)]',
      iconColor: 'text-[hsl(35,90%,50%)] dark:text-[hsl(35,90%,60%)]',
    },
    error: {
      bg: 'bg-[hsl(0,70%,96%)] dark:bg-[hsl(0,40%,12%)]',
      border: 'border-[hsl(0,60%,80%)] dark:border-[hsl(0,40%,30%)]',
      text: 'text-[hsl(0,60%,30%)] dark:text-[hsl(0,50%,75%)]',
      iconColor: 'text-[hsl(0,70%,50%)] dark:text-[hsl(0,60%,60%)]',
    },
    success: {
      bg: 'bg-[hsl(145,50%,95%)] dark:bg-[hsl(145,30%,12%)]',
      border: 'border-[hsl(145,50%,75%)] dark:border-[hsl(145,30%,30%)]',
      text: 'text-[hsl(145,50%,25%)] dark:text-[hsl(145,40%,75%)]',
      iconColor: 'text-[hsl(145,60%,40%)] dark:text-[hsl(145,50%,55%)]',
    },
  };

  return (
    <div className="space-y-2 px-4 pt-3">
      {visibleAlerts.map((alert) => {
        const Icon = iconMap[alert.alert_type] || Info;
        const style = styleMap[alert.alert_type] || styleMap.info;

        return (
          <div
            key={alert.id}
            className={`flex items-center gap-3 p-3 rounded-lg border text-center ${style.bg} ${style.border}`}
          >
            <Icon className={`h-5 w-5 shrink-0 ${style.iconColor}`} />
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${style.text}`}>{alert.title}</p>
              <p className={`text-xs mt-0.5 ${style.text} opacity-80`}>{alert.message}</p>
            </div>
            <button
              onClick={() => handleDismiss(alert.id)}
              className="text-muted-foreground hover:text-foreground shrink-0 transition-colors"
              aria-label="Dismiss alert"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
