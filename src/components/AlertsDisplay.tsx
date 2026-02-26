import { useEffect, useState } from 'react';
import { AlertTriangle, AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useAdminData } from '@/hooks/useAdminData';

export function AlertsDisplay() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadAlerts = async () => {
      // Try to fetch alerts from localStorage first for instant display
      const cached = localStorage.getItem('admin_alerts');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setAlerts(parsed.alerts || []);
        } catch {
          // Invalid cache, ignore
        }
      }
    };

    loadAlerts();

    // Check for updates every 30 seconds
    const interval = setInterval(loadAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  const visibleAlerts = alerts.filter(a => !dismissedIds.has(a.id));

  const iconMap: Record<string, React.ElementType> = {
    info: Info,
    warning: AlertTriangle,
    error: AlertCircle,
    success: CheckCircle2,
  };

  const styleMap: Record<string, { bg: string; border: string; text: string }> = {
    info: {
      bg: 'bg-blue-50 dark:bg-blue-950/20',
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-900 dark:text-blue-200',
    },
    warning: {
      bg: 'bg-yellow-50 dark:bg-yellow-950/20',
      border: 'border-yellow-200 dark:border-yellow-800',
      text: 'text-yellow-900 dark:text-yellow-200',
    },
    error: {
      bg: 'bg-red-50 dark:bg-red-950/20',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-900 dark:text-red-200',
    },
    success: {
      bg: 'bg-green-50 dark:bg-green-950/20',
      border: 'border-green-200 dark:border-green-800',
      text: 'text-green-900 dark:text-green-200',
    },
  };

  if (visibleAlerts.length === 0) return null;

  return (
    <div className="space-y-2 p-4">
      {visibleAlerts.map((alert) => {
        const Icon = iconMap[alert.type] || Info;
        const style = styleMap[alert.type] || styleMap.info;

        return (
          <div
            key={alert.id}
            className={`flex items-start gap-3 p-3 rounded-lg border ${style.bg} ${style.border}`}
          >
            <Icon className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${style.text}`}>{alert.title}</p>
              <p className={`text-xs mt-0.5 ${style.text} opacity-90`}>{alert.message}</p>
            </div>
            <button
              onClick={() => setDismissedIds(prev => new Set(prev).add(alert.id))}
              className="text-muted-foreground hover:text-foreground shrink-0 mt-0.5"
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
