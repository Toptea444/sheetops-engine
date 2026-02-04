import { useMemo } from 'react';
import { TrendingUp, Award, Target, Zap, Crown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { SheetData } from '@/types/bonus';
import type { CyclePeriod } from '@/lib/cycleUtils';
import { getWeeksInCycle, getCurrentWeekInCycle } from '@/hooks/useLeaderboard';

interface WeeklyMVPsProps {
  sheetData: SheetData | null;
  currentUserId: string | null;
  cycle: CyclePeriod;
}

interface MVPAward {
  id: string;
  title: string;
  description: string;
  workerId: string;
  value: number | string;
  icon: React.ReactNode;
  gradient: string;
  emoji: string;
}

function maskWorkerId(workerId: string): string {
  if (workerId.length <= 4) return workerId;
  const prefix = workerId.substring(0, 2);
  const suffix = workerId.substring(workerId.length - 4);
  return `${prefix}••${suffix}`;
}

export function WeeklyMVPs({ sheetData, currentUserId, cycle }: WeeklyMVPsProps) {
  const currentWeek = useMemo(() => getCurrentWeekInCycle(cycle), [cycle]);
  const weeks = useMemo(() => getWeeksInCycle(cycle), [cycle]);
  
  // Get previous week for comparison
  const previousWeek = useMemo(() => {
    if (!currentWeek || weeks.length < 2) return null;
    const currentIdx = weeks.findIndex(w => w.weekNumber === currentWeek.weekNumber);
    return currentIdx > 0 ? weeks[currentIdx - 1] : null;
  }, [currentWeek, weeks]);

  // Parse worker data from sheet rows
  const parsedWorkers = useMemo(() => {
    if (!sheetData || sheetData.rows.length === 0) return [];
    
    const headers = sheetData.headers;
    const idColIndex = headers.findIndex(h => 
      h.toUpperCase().includes('ID') || h.toUpperCase().includes('WORKER')
    );
    
    if (idColIndex === -1) return [];
    
    const dateColumns: { index: number; date: Date }[] = [];
    headers.forEach((h, i) => {
      if (i === idColIndex) return;
      const parsed = new Date(h);
      if (!isNaN(parsed.getTime())) {
        dateColumns.push({ index: i, date: parsed });
      } else {
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

  const mvpAwards = useMemo((): MVPAward[] => {
    if (parsedWorkers.length === 0 || !currentWeek) return [];

    const awards: MVPAward[] = [];
    
    // Calculate metrics for each worker
    const workerMetrics: Map<string, {
      weekTotal: number;
      prevWeekTotal: number;
      daysWorked: number;
      highestDay: number;
      consistency: number;
    }> = new Map();

    parsedWorkers.forEach((worker) => {
      let weekTotal = 0;
      let prevWeekTotal = 0;
      const dailyValues: number[] = [];
      let highestDay = 0;

      worker.dailyData.forEach((day) => {
        const dayDate = day.date;
        const value = day.value || 0;
        
        // Current week
        if (dayDate >= currentWeek.startDate && dayDate <= currentWeek.endDate) {
          weekTotal += value;
          if (value > 0) {
            dailyValues.push(value);
            highestDay = Math.max(highestDay, value);
          }
        }
        
        // Previous week
        if (previousWeek && dayDate >= previousWeek.startDate && dayDate <= previousWeek.endDate) {
          prevWeekTotal += value;
        }
      });

      if (weekTotal > 0) {
        const avg = dailyValues.length > 0 
          ? dailyValues.reduce((a, b) => a + b, 0) / dailyValues.length 
          : 0;
        const variance = dailyValues.length > 0
          ? dailyValues.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / dailyValues.length
          : 0;
        const stdDev = Math.sqrt(variance);

        workerMetrics.set(worker.id, {
          weekTotal,
          prevWeekTotal,
          daysWorked: dailyValues.length,
          highestDay,
          consistency: stdDev,
        });
      }
    });

    // 1. Top Earner (Champion)
    let topEarner: { id: string; total: number } | null = null;
    workerMetrics.forEach((metrics, workerId) => {
      if (!topEarner || metrics.weekTotal > topEarner.total) {
        topEarner = { id: workerId, total: metrics.weekTotal };
      }
    });

    if (topEarner) {
      const isCurrentUser = topEarner.id.toUpperCase() === currentUserId?.toUpperCase();
      awards.push({
        id: 'champion',
        title: 'Champion',
        description: 'Highest earner this week',
        workerId: topEarner.id,
        value: `₦${topEarner.total.toLocaleString()}`,
        icon: <Crown className="h-4 w-4" />,
        gradient: 'from-amber-500/20 to-yellow-400/10',
        emoji: '👑',
      });
    }

    // 2. Most Improved (biggest week-over-week growth)
    let mostImproved: { id: string; growth: number; percent: number } | null = null;
    workerMetrics.forEach((metrics, workerId) => {
      if (metrics.prevWeekTotal > 0) {
        const growth = metrics.weekTotal - metrics.prevWeekTotal;
        const percent = (growth / metrics.prevWeekTotal) * 100;
        if (growth > 0 && (!mostImproved || growth > mostImproved.growth)) {
          mostImproved = { id: workerId, growth, percent };
        }
      }
    });

    if (mostImproved && mostImproved.percent >= 10) {
      awards.push({
        id: 'improved',
        title: 'Most Improved',
        description: 'Biggest growth from last week',
        workerId: mostImproved.id,
        value: `+${Math.round(mostImproved.percent)}%`,
        icon: <TrendingUp className="h-4 w-4" />,
        gradient: 'from-green-500/20 to-emerald-400/10',
        emoji: '📈',
      });
    }

    // 3. Consistency King (lowest std deviation with 3+ days worked)
    let consistencyKing: { id: string; stdDev: number; daysWorked: number } | null = null;
    workerMetrics.forEach((metrics, workerId) => {
      if (metrics.daysWorked >= 3) {
        if (!consistencyKing || metrics.consistency < consistencyKing.stdDev) {
          consistencyKing = { id: workerId, stdDev: metrics.consistency, daysWorked: metrics.daysWorked };
        }
      }
    });

    if (consistencyKing) {
      awards.push({
        id: 'consistent',
        title: 'Consistency King',
        description: 'Most consistent daily performance',
        workerId: consistencyKing.id,
        value: `${consistencyKing.daysWorked} days`,
        icon: <Target className="h-4 w-4" />,
        gradient: 'from-blue-500/20 to-cyan-400/10',
        emoji: '🎯',
      });
    }

    // 4. Rising Star (new worker with strong performance, or someone not usually in top but doing well)
    // Find someone who wasn't in top 5 last week but is now in top 10
    const sortedByWeekTotal = [...workerMetrics.entries()]
      .sort((a, b) => b[1].weekTotal - a[1].weekTotal);
    const sortedByPrevTotal = [...workerMetrics.entries()]
      .filter(([_, m]) => m.prevWeekTotal > 0)
      .sort((a, b) => b[1].prevWeekTotal - a[1].prevWeekTotal);

    const prevTop5 = new Set(sortedByPrevTotal.slice(0, 5).map(([id]) => id));
    const currentTop10 = sortedByWeekTotal.slice(0, 10);
    
    for (const [workerId, metrics] of currentTop10) {
      if (!prevTop5.has(workerId) && metrics.weekTotal > 0) {
        awards.push({
          id: 'rising',
          title: 'Rising Star',
          description: 'Breaking into the top ranks',
          workerId,
          value: `₦${metrics.weekTotal.toLocaleString()}`,
          icon: <Zap className="h-4 w-4" />,
          gradient: 'from-purple-500/20 to-pink-400/10',
          emoji: '🌟',
        });
        break;
      }
    }

    // 5. Power Day (highest single-day earnings)
    let powerDay: { id: string; highest: number } | null = null;
    workerMetrics.forEach((metrics, workerId) => {
      if (!powerDay || metrics.highestDay > powerDay.highest) {
        powerDay = { id: workerId, highest: metrics.highestDay };
      }
    });

    if (powerDay && powerDay.highest >= 3000 && powerDay.id !== topEarner?.id) {
      awards.push({
        id: 'power',
        title: 'Power Day',
        description: 'Highest single-day earnings',
        workerId: powerDay.id,
        value: `₦${powerDay.highest.toLocaleString()}`,
        icon: <Award className="h-4 w-4" />,
        gradient: 'from-orange-500/20 to-red-400/10',
        emoji: '💪',
      });
    }

    return awards.slice(0, 4); // Limit to 4 MVPs
  }, [sheetData, currentWeek, previousWeek, currentUserId]);

  if (!sheetData || !currentWeek) {
    return (
      <div className="text-center py-4 text-sm text-muted-foreground">
        No MVP data available
      </div>
    );
  }

  if (mvpAwards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <Award className="h-8 w-8 text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">MVPs will appear as the week progresses</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Award className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Weekly MVPs</span>
        <Badge variant="secondary" className="text-xs">
          Week {currentWeek.weekNumber}
        </Badge>
      </div>

      {/* MVP Cards */}
      <div className="grid grid-cols-2 gap-2">
        {mvpAwards.map((award, index) => {
          const isCurrentUser = award.workerId.toUpperCase() === currentUserId?.toUpperCase();
          const displayName = isCurrentUser ? 'You' : maskWorkerId(award.workerId);

          return (
            <div
              key={award.id}
              className={cn(
                'p-3 rounded-lg border transition-all duration-300 animate-fade-in',
                `bg-gradient-to-br ${award.gradient}`,
                isCurrentUser && 'ring-2 ring-primary/30'
              )}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-start gap-2">
                <span className="text-2xl">{award.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    {award.icon}
                    <span className="text-xs font-semibold truncate">{award.title}</span>
                  </div>
                  <p className={cn(
                    'text-sm font-medium truncate mt-0.5',
                    isCurrentUser && 'text-primary'
                  )}>
                    {displayName}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {award.value}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
