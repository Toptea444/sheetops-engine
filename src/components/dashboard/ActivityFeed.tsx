import { useMemo } from 'react';
import { Trophy, TrendingUp, Flame, Star, Award, Zap, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SheetData } from '@/types/bonus';
import type { CyclePeriod } from '@/lib/cycleUtils';
import { getCurrentWeekInCycle } from '@/hooks/useLeaderboard';

interface ActivityFeedProps {
  sheetData: SheetData | null;
  currentUserId: string | null;
  cycle: CyclePeriod;
}

interface ActivityItem {
  id: string;
  type: 'top_earner' | 'streak' | 'milestone' | 'rank_up' | 'new_record';
  message: string;
  workerId: string;
  icon: React.ReactNode;
  color: string;
  timestamp: Date;
}

function maskWorkerId(workerId: string): string {
  if (workerId.length <= 4) return workerId;
  const prefix = workerId.substring(0, 2);
  const suffix = workerId.substring(workerId.length - 4);
  return `${prefix}••${suffix}`;
}

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'yesterday';
  return `${diffDays}d ago`;
}

export function ActivityFeed({ sheetData, currentUserId, cycle }: ActivityFeedProps) {
  const currentWeek = useMemo(() => getCurrentWeekInCycle(cycle), [cycle]);

  // Parse worker data from sheet rows
  const parsedWorkers = useMemo(() => {
    if (!sheetData || sheetData.rows.length === 0) return [];
    
    // Find worker ID column and date columns from headers
    const headers = sheetData.headers;
    const idColIndex = headers.findIndex(h => 
      h.toUpperCase().includes('ID') || h.toUpperCase().includes('WORKER')
    );
    
    if (idColIndex === -1) return [];
    
    // Find date columns (typically numeric or date-like headers)
    const dateColumns: { index: number; date: Date }[] = [];
    headers.forEach((h, i) => {
      if (i === idColIndex) return;
      // Try to parse as date
      const parsed = new Date(h);
      if (!isNaN(parsed.getTime())) {
        dateColumns.push({ index: i, date: parsed });
      } else {
        // Try numeric day of month
        const dayNum = parseInt(h, 10);
        if (!isNaN(dayNum) && dayNum >= 1 && dayNum <= 31) {
          const now = new Date();
          dateColumns.push({ index: i, date: new Date(now.getFullYear(), now.getMonth(), dayNum) });
        }
      }
    });

    return sheetData.rows.map(row => ({
      id: row[idColIndex] || '',
      dailyData: dateColumns.map(dc => ({
        date: dc.date,
        value: parseFloat(row[dc.index]) || 0,
      })),
    })).filter(w => w.id);
  }, [sheetData]);

  // Generate activity items from sheet data
  const activities: ActivityItem[] = useMemo(() => {
    if (parsedWorkers.length === 0 || !currentWeek) return [];

    const items: ActivityItem[] = [];
    const now = new Date();

    // Find top performers for the current week
    const weeklyTotals: Map<string, number> = new Map();
    const workerHighDays: Map<string, number> = new Map();

    parsedWorkers.forEach((worker) => {
      let weekTotal = 0;
      let highestDay = 0;

      worker.dailyData.forEach((day) => {
        const dayDate = day.date;
        
        if (dayDate >= currentWeek.startDate && dayDate <= currentWeek.endDate) {
          const value = day.value || 0;
          weekTotal += value;
          highestDay = Math.max(highestDay, value);
        }
      });

      if (weekTotal > 0) {
        weeklyTotals.set(worker.id, weekTotal);
        workerHighDays.set(worker.id, highestDay);
      }
    });

    // Sort by weekly totals
    const sortedWorkers = [...weeklyTotals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Generate activities
    sortedWorkers.forEach(([workerId, total], index) => {
      const isCurrentUser = workerId.toUpperCase() === currentUserId?.toUpperCase();
      const displayName = isCurrentUser ? 'You' : maskWorkerId(workerId);

      // Top 3 earners
      if (index < 3) {
        items.push({
          id: `top-${workerId}`,
          type: 'top_earner',
          message: `${displayName} ${index === 0 ? 'is leading' : `ranked #${index + 1}`} this week`,
          workerId,
          icon: index === 0 ? <Trophy className="h-4 w-4" /> : <Award className="h-4 w-4" />,
          color: index === 0 ? 'text-amber-500' : index === 1 ? 'text-slate-400' : 'text-amber-600',
          timestamp: new Date(now.getTime() - index * 3600000),
        });
      }

      // High single-day achievement
      const highDay = workerHighDays.get(workerId) || 0;
      if (highDay >= 5000) {
        items.push({
          id: `high-${workerId}`,
          type: 'new_record',
          message: `${displayName} earned ₦${highDay.toLocaleString()} in a day!`,
          workerId,
          icon: <Star className="h-4 w-4" />,
          color: 'text-yellow-500',
          timestamp: new Date(now.getTime() - (index + 3) * 3600000),
        });
      }
    });

    // Sort by timestamp and limit
    return items
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 8);
  }, [parsedWorkers, currentWeek, currentUserId]);

  if (!sheetData) {
    return (
      <div className="text-center py-4 text-sm text-muted-foreground">
        No activity data available
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <Users className="h-8 w-8 text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">No recent activity</p>
        <p className="text-xs text-muted-foreground/70">Check back as the week progresses</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <Zap className="h-4 w-4 text-primary" />
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-success animate-pulse" />
        </div>
        <span className="text-sm font-medium">Live Activity</span>
      </div>

      {/* Activity list */}
      <div className="space-y-2">
        {activities.map((activity, index) => {
          const isCurrentUser = activity.workerId.toUpperCase() === currentUserId?.toUpperCase();
          
          return (
            <div
              key={activity.id}
              className={cn(
                'flex items-start gap-3 p-2.5 rounded-lg transition-all duration-200',
                'animate-fade-in hover:bg-muted/30',
                isCurrentUser && 'bg-primary/5 border border-primary/20'
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className={cn(
                'h-7 w-7 rounded-full flex items-center justify-center shrink-0',
                'bg-muted/50',
                activity.color
              )}>
                {activity.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm leading-snug">
                  {activity.message}
                </p>
                <span className="text-xs text-muted-foreground">
                  {getRelativeTime(activity.timestamp)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
