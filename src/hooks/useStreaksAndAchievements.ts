import { useMemo } from 'react';
import type { BonusResult } from '@/types/bonus';
import type { CyclePeriod } from '@/lib/cycleUtils';
import { isDateInCycle } from '@/lib/cycleUtils';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: Date;
  progress?: number;
  target?: number;
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastWorkDate: Date | null;
  streakActive: boolean;
}

interface UseStreaksAndAchievementsResult {
  streakData: StreakData;
  achievements: Achievement[];
  totalUnlocked: number;
}

export function useStreaksAndAchievements(
  results: BonusResult[],
  cycle: CyclePeriod
): UseStreaksAndAchievementsResult {
  const streakData = useMemo(() => {
    // Collect all dates with earnings (non-percent sheets only)
    const workDates = new Set<string>();
    
    results.forEach((result) => {
      if (result.valueType === 'percent') return;
      
      result.dailyBreakdown?.forEach((day) => {
        if (day.value > 0 && day.fullDate) {
          const date = new Date(day.fullDate);
          // Format as YYYY-MM-DD for deduplication
          const dateKey = date.toISOString().split('T')[0];
          workDates.add(dateKey);
        }
      });
    });

    // Sort dates
    const sortedDates = Array.from(workDates).sort();
    
    if (sortedDates.length === 0) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastWorkDate: null,
        streakActive: false,
      };
    }

    // Calculate streaks
    let currentStreak = 1;
    let longestStreak = 1;
    let tempStreak = 1;

    for (let i = 1; i < sortedDates.length; i++) {
      const prevDate = new Date(sortedDates[i - 1]);
      const currDate = new Date(sortedDates[i]);
      const diffDays = Math.round(
        (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays === 1) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }

      longestStreak = Math.max(longestStreak, tempStreak);
    }

    // Check if streak is still active (worked yesterday or today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const lastWorkDateStr = sortedDates[sortedDates.length - 1];
    const lastWorkDate = new Date(lastWorkDateStr);
    
    const streakActive = 
      lastWorkDateStr === today.toISOString().split('T')[0] ||
      lastWorkDateStr === yesterday.toISOString().split('T')[0];

    // Calculate current streak from the end
    currentStreak = 1;
    for (let i = sortedDates.length - 2; i >= 0; i--) {
      const prevDate = new Date(sortedDates[i]);
      const currDate = new Date(sortedDates[i + 1]);
      const diffDays = Math.round(
        (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays === 1) {
        currentStreak++;
      } else {
        break;
      }
    }

    return {
      currentStreak: streakActive ? currentStreak : 0,
      longestStreak,
      lastWorkDate,
      streakActive,
    };
  }, [results]);

  const achievements = useMemo(() => {
    // Calculate cycle total earnings
    let cycleTotal = 0;
    let allTimeTotal = 0;
    let daysWorked = 0;
    let highestDay = 0;

    const cycleDays = new Set<string>();

    results.forEach((result) => {
      if (result.valueType === 'percent') return;
      
      result.dailyBreakdown?.forEach((day) => {
        if (day.fullDate === undefined) return;
        
        allTimeTotal += day.value;
        if (day.value > highestDay) highestDay = day.value;
        
        const dayDate = new Date(day.fullDate);
        if (isDateInCycle(dayDate, cycle) && day.value > 0) {
          cycleTotal += day.value;
          cycleDays.add(day.fullDate.toString());
        }
      });
    });

    daysWorked = cycleDays.size;

    const achievementDefs: Achievement[] = [
      {
        id: 'first_day',
        name: 'First Steps',
          description: 'Work at least 1 day (earnings > 0) in the selected cycle',
        icon: '🚀',
        unlocked: daysWorked >= 1,
        progress: Math.min(daysWorked, 1),
        target: 1,
      },
      {
        id: 'streak_3',
        name: 'On a Roll',
          description: 'Work 3 consecutive days (earnings > 0)',
        icon: '🔥',
        unlocked: streakData.longestStreak >= 3,
        progress: Math.min(streakData.longestStreak, 3),
        target: 3,
      },
      {
        id: 'streak_7',
        name: 'Week Warrior',
          description: 'Work 7 consecutive days (earnings > 0)',
        icon: '⚡',
        unlocked: streakData.longestStreak >= 7,
        progress: Math.min(streakData.longestStreak, 7),
        target: 7,
      },
      {
        id: 'streak_14',
        name: 'Unstoppable',
          description: 'Work 14 consecutive days (earnings > 0)',
        icon: '💪',
        unlocked: streakData.longestStreak >= 14,
        progress: Math.min(streakData.longestStreak, 14),
        target: 14,
      },
      {
        id: 'earn_10k',
        name: 'Rising Star',
          description: 'Cycle total earnings ≥ ₦10,000',
        icon: '⭐',
        unlocked: cycleTotal >= 10000,
        progress: Math.min(cycleTotal, 10000),
        target: 10000,
      },
      {
        id: 'earn_50k',
        name: 'Money Maker',
          description: 'Cycle total earnings ≥ ₦50,000',
        icon: '💰',
        unlocked: cycleTotal >= 50000,
        progress: Math.min(cycleTotal, 50000),
        target: 50000,
      },
      {
        id: 'earn_100k',
        name: 'Big League',
          description: 'Cycle total earnings ≥ ₦100,000',
        icon: '🏆',
        unlocked: cycleTotal >= 100000,
        progress: Math.min(cycleTotal, 100000),
        target: 100000,
      },
      {
        id: 'day_5k',
        name: 'Power Day',
          description: 'All-time: earn ≥ ₦5,000 in a single day',
        icon: '💎',
        unlocked: highestDay >= 5000,
        progress: Math.min(highestDay, 5000),
        target: 5000,
      },
      {
        id: 'day_10k',
        name: 'Super Day',
          description: 'All-time: earn ≥ ₦10,000 in a single day',
        icon: '🌟',
        unlocked: highestDay >= 10000,
        progress: Math.min(highestDay, 10000),
        target: 10000,
      },
      {
        id: 'work_20_days',
        name: 'Consistent',
          description: 'Work 20 different days in the selected cycle',
        icon: '📅',
        unlocked: daysWorked >= 20,
        progress: Math.min(daysWorked, 20),
        target: 20,
      },
    ];

    return achievementDefs;
  }, [results, cycle, streakData.longestStreak]);

  const totalUnlocked = achievements.filter((a) => a.unlocked).length;

  return {
    streakData,
    achievements,
    totalUnlocked,
  };
}
