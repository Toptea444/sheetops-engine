import { useState, useMemo, useEffect } from 'react';
import { Target, Clock, CheckCircle2, Trophy, Zap, Flame, TrendingUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useConfetti } from '@/hooks/useConfetti';
import type { BonusResult } from '@/types/bonus';
import type { CyclePeriod } from '@/lib/cycleUtils';
import { getWeeksInCycle, getCurrentWeekInCycle } from '@/hooks/useLeaderboard';

interface WeeklyChallengesProps {
  results: BonusResult[];
  cycle: CyclePeriod;
}

interface Challenge {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  target: number;
  current: number;
  unit: string;
  reward: string;
}

function getWeekStorageKey(weekNumber: number, cycleStart: Date): string {
  return `challenges-week-${weekNumber}-${cycleStart.toISOString().split('T')[0]}`;
}

export function WeeklyChallenges({ results, cycle }: WeeklyChallengesProps) {
  const { triggerGoalComplete } = useConfetti();
  const [completedChallenges, setCompletedChallenges] = useState<Set<string>>(new Set());

  const currentWeek = useMemo(() => getCurrentWeekInCycle(cycle), [cycle]);
  const weeks = useMemo(() => getWeeksInCycle(cycle), [cycle]);

  // Calculate weekly stats
  const weekStats = useMemo(() => {
    if (!currentWeek) return { earnings: 0, daysWorked: 0, highestDay: 0, avgDaily: 0 };

    let earnings = 0;
    const workDays = new Set<number>();
    let highestDay = 0;

    results.forEach((result) => {
      if (result.valueType === 'percent') return;

      result.dailyBreakdown?.forEach((day) => {
        if (!day.fullDate) return;
        const dayDate = new Date(day.fullDate);
        
        if (dayDate >= currentWeek.startDate && dayDate <= currentWeek.endDate) {
          earnings += day.value;
          if (day.value > 0) {
            workDays.add(day.fullDate);
            highestDay = Math.max(highestDay, day.value);
          }
        }
      });
    });

    const daysWorked = workDays.size;
    const avgDaily = daysWorked > 0 ? Math.round(earnings / daysWorked) : 0;

    return { earnings, daysWorked, highestDay, avgDaily };
  }, [results, currentWeek]);

  // Generate weekly challenges based on performance
  const challenges: Challenge[] = useMemo(() => {
    if (!currentWeek) return [];

    // Calculate suggested targets based on past performance
    const baseDaily = weekStats.avgDaily > 0 ? weekStats.avgDaily : 2000;
    
    return [
      {
        id: 'weekly_target',
        name: 'Weekly Warrior',
        description: `Earn ₦${(baseDaily * 5).toLocaleString()} this week`,
        icon: <Trophy className="h-4 w-4 text-amber-500" />,
        target: baseDaily * 5,
        current: weekStats.earnings,
        unit: '₦',
        reward: '🏆 Champion Badge',
      },
      {
        id: 'work_5_days',
        name: 'Consistent Worker',
        description: 'Work at least 5 days this week',
        icon: <Flame className="h-4 w-4 text-orange-500" />,
        target: 5,
        current: weekStats.daysWorked,
        unit: 'days',
        reward: '🔥 Streak Master',
      },
      {
        id: 'power_day',
        name: 'Power Hour',
        description: `Hit ₦${Math.max(3000, Math.round(baseDaily * 1.5)).toLocaleString()} in a single day`,
        icon: <Zap className="h-4 w-4 text-yellow-500" />,
        target: Math.max(3000, Math.round(baseDaily * 1.5)),
        current: weekStats.highestDay,
        unit: '₦',
        reward: '⚡ Speed Demon',
      },
      {
        id: 'beat_average',
        name: 'Level Up',
        description: 'Beat your daily average by 20%',
        icon: <TrendingUp className="h-4 w-4 text-green-500" />,
        target: Math.round(baseDaily * 1.2),
        current: weekStats.highestDay,
        unit: '₦/day',
        reward: '📈 Rising Star',
      },
    ];
  }, [currentWeek, weekStats]);

  // Load completed challenges from localStorage
  useEffect(() => {
    if (!currentWeek) return;
    const key = getWeekStorageKey(currentWeek.weekNumber, cycle.startDate);
    const saved = localStorage.getItem(key);
    if (saved) {
      setCompletedChallenges(new Set(JSON.parse(saved)));
    } else {
      setCompletedChallenges(new Set());
    }
  }, [currentWeek, cycle.startDate]);

  // Check for newly completed challenges
  useEffect(() => {
    if (!currentWeek) return;

    const newCompleted = new Set(completedChallenges);
    let hasNew = false;

    challenges.forEach((challenge) => {
      const isComplete = challenge.current >= challenge.target;
      if (isComplete && !completedChallenges.has(challenge.id)) {
        newCompleted.add(challenge.id);
        hasNew = true;
        triggerGoalComplete(`challenge-${challenge.id}-${currentWeek.weekNumber}`);
      }
    });

    if (hasNew) {
      setCompletedChallenges(newCompleted);
      const key = getWeekStorageKey(currentWeek.weekNumber, cycle.startDate);
      localStorage.setItem(key, JSON.stringify([...newCompleted]));
    }
  }, [challenges, completedChallenges, currentWeek, cycle.startDate, triggerGoalComplete]);

  // Calculate time remaining in week
  const timeRemaining = useMemo(() => {
    if (!currentWeek) return null;
    const now = new Date();
    const end = new Date(currentWeek.endDate);
    end.setHours(23, 59, 59, 999);
    
    const diff = end.getTime() - now.getTime();
    if (diff <= 0) return 'Week ended';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h left`;
    return `${hours}h left`;
  }, [currentWeek]);

  if (!currentWeek) {
    return (
      <div className="text-center py-4 text-sm text-muted-foreground">
        No active week in this cycle
      </div>
    );
  }

  const completedCount = challenges.filter(c => c.current >= c.target).length;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Weekly Challenges</span>
          <Badge variant="secondary" className="text-xs">
            Week {currentWeek.weekNumber}
          </Badge>
        </div>
        {timeRemaining && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {timeRemaining}
          </span>
        )}
      </div>

      {/* Progress summary */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{completedCount}/{challenges.length} completed</span>
        <Progress value={(completedCount / challenges.length) * 100} className="flex-1 h-1.5" />
      </div>

      {/* Challenge cards */}
      <div className="space-y-2">
        {challenges.map((challenge) => {
          const isComplete = challenge.current >= challenge.target;
          const progress = Math.min((challenge.current / challenge.target) * 100, 100);

          return (
            <div
              key={challenge.id}
              className={cn(
                'p-3 rounded-lg border transition-all duration-300',
                isComplete
                  ? 'bg-success/5 border-success/30'
                  : 'bg-muted/20 border-border/60 hover:border-border'
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  'h-8 w-8 rounded-full flex items-center justify-center shrink-0',
                  isComplete ? 'bg-success/20' : 'bg-muted'
                )}>
                  {isComplete ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : (
                    challenge.icon
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn(
                      'text-sm font-medium',
                      isComplete && 'text-success'
                    )}>
                      {challenge.name}
                    </span>
                    {isComplete && (
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {challenge.reward}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {challenge.description}
                  </p>
                  <div className="mt-2">
                    <Progress value={progress} className={cn('h-1', isComplete && '[&>div]:bg-success')} />
                    <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                      <span>
                        {challenge.unit === '₦' ? `₦${challenge.current.toLocaleString()}` : `${challenge.current} ${challenge.unit}`}
                      </span>
                      <span>
                        {challenge.unit === '₦' ? `₦${challenge.target.toLocaleString()}` : `${challenge.target} ${challenge.unit}`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
