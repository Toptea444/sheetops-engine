import { useMemo, useCallback } from 'react';
import type { BonusResult, DailyBonus } from '@/types/bonus';
import type { CyclePeriod } from '@/lib/cycleUtils';
import { 
  getPreviousCycle, 
  isDateInCycle, 
  getCycleKey,
  getTotalDaysInCycle,
  isInNewCycle
} from '@/lib/cycleUtils';

// ─── Types ───────────────────────────────────────────────────
export interface DayStats {
  date: string;
  fullDate: number;
  amount: number;
}

export interface DoubleBonusDayStats {
  date: string;
  fullDate: number;
  amount: number;
}

export interface DoubleBonusPeriodData {
  startDate: string;
  endDate: string;
  totalEarned: number;
  targetAmount: number;
  dailyBreakdown: DoubleBonusDayStats[];
  achievementLevel: 'exceeded' | 'achieved' | 'close' | 'needs-work';
  percentOfTarget: number;
}

export interface CycleSummaryData {
  previousCycle: CyclePeriod;
  totalBonus: number;
  bestDays: DayStats[];
  worstDays: DayStats[];
  activeDays: number;
  inactiveDays: number;
  totalCycleDays: number;
  rankingBonusTotal: number;
  rankingBonusActiveDays: number;
  hasRankingBonusData: boolean;
  hasDailyPerformanceData: boolean;
  doubleBonusPeriod: DoubleBonusPeriodData | null;
  stageRanking: {
    rank: number;
    totalInStage: number;
    percentile: number;
    stageName: string;
  } | null;
}

// ─── Sheet Type Detection ────────────────────────────────────
function isDailyPerformanceSheet(name: string): boolean {
  const upper = name.toUpperCase();
  // Match "Daily & Performance" style sheets
  return upper.includes('DAILY') || upper.includes('PERFORMANCE');
}

function isRankingBonusSheet(name: string): boolean {
  const n = name.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return n.includes('RANKINGBONUS') || (n.includes('RANKING') && n.includes('BONUS'));
}

// ─── LocalStorage Keys ───────────────────────────────────────
const SUMMARY_SEEN_PREFIX = 'cycle_summary_animated_seen_';

export function getSummarySeenKey(cycleKey: string): string {
  return `${SUMMARY_SEEN_PREFIX}${cycleKey}`;
}

export function hasSeenSummary(cycleKey: string): boolean {
  try {
    return localStorage.getItem(getSummarySeenKey(cycleKey)) === 'true';
  } catch {
    return false;
  }
}

export function markSummaryAsSeen(cycleKey: string): void {
  try {
    localStorage.setItem(getSummarySeenKey(cycleKey), 'true');
  } catch {
    // ignore
  }
}

// ─── Main Hook ───────────────────────────────────────────────
export function useCycleSummary(
  results: BonusResult[],
  currentCycle: CyclePeriod
): {
  summaryData: CycleSummaryData | null;
  shouldShowAnimatedSummary: boolean;
  markAsShown: () => void;
} {
  const previousCycle = useMemo(() => getPreviousCycle(currentCycle), [currentCycle]);
  const currentCycleKey = getCycleKey(currentCycle);

  // Aggregate data from previous cycle
  const summaryData = useMemo<CycleSummaryData | null>(() => {
    if (results.length === 0) return null;

    // Separate results by sheet type
    const dailyPerformanceResults: BonusResult[] = [];
    const rankingBonusResults: BonusResult[] = [];

    for (const result of results) {
      const sheetName = result.sheetName || '';
      if (isRankingBonusSheet(sheetName)) {
        rankingBonusResults.push(result);
      } else if (isDailyPerformanceSheet(sheetName)) {
        dailyPerformanceResults.push(result);
      } else {
        // Default to daily performance if unclear
        dailyPerformanceResults.push(result);
      }
    }

    // Aggregate daily earnings from Daily & Performance sheets for previous cycle
    const dailyEarningsMap = new Map<string, DayStats>();

    for (const result of dailyPerformanceResults) {
      for (const day of result.dailyBreakdown || []) {
        if (!day.fullDate) continue;
        
        const dayDate = new Date(day.fullDate);
        if (!isDateInCycle(dayDate, previousCycle)) continue;

        const dateKey = day.date;
        const existing = dailyEarningsMap.get(dateKey);
        
        if (existing) {
          existing.amount += day.value || 0;
        } else {
          dailyEarningsMap.set(dateKey, {
            date: day.date,
            fullDate: day.fullDate,
            amount: day.value || 0
          });
        }
      }
    }

    // Calculate ranking bonus stats for previous cycle
    let rankingBonusTotal = 0;
    const rankingBonusDaysSet = new Set<string>();

    for (const result of rankingBonusResults) {
      for (const day of result.dailyBreakdown || []) {
        if (!day.fullDate) continue;
        
        const dayDate = new Date(day.fullDate);
        if (!isDateInCycle(dayDate, previousCycle)) continue;

        if (day.value > 0) {
          rankingBonusTotal += day.value;
          rankingBonusDaysSet.add(day.date);
        }
      }
    }

    // Convert to array and sort
    const dailyEarnings = Array.from(dailyEarningsMap.values());
    
    if (dailyEarnings.length === 0 && rankingBonusTotal === 0) {
      return null;
    }

    // Calculate stats
    const totalBonus = dailyEarnings.reduce((sum, d) => sum + d.amount, 0);
    const activeDays = dailyEarnings.filter(d => d.amount > 0).length;
    const totalCycleDays = getTotalDaysInCycle(previousCycle);
    const inactiveDays = totalCycleDays - activeDays;

    // Sort for best/worst days (only consider days with data)
    const daysWithEarnings = dailyEarnings.filter(d => d.amount > 0);
    
    // Get top 3 best days (highest amounts, then by date descending for consistent ordering)
    const bestDays = [...daysWithEarnings]
      .sort((a, b) => b.amount - a.amount || b.fullDate - a.fullDate)
      .slice(0, 3);
    
    // Get bottom 3 worst days - lowest amounts first, then by date ascending for consistent ordering
    const worstDays = [...daysWithEarnings]
      .sort((a, b) => a.amount - b.amount || a.fullDate - b.fullDate)
      .slice(0, 3);

    // Calculate Double Bonus Period data (Feb 23-28)
    // The double bonus period is always days 23-28 of the cycle's month
    let doubleBonusPeriod: DoubleBonusPeriodData | null = null;
    
    const cycleYear = previousCycle.start.getFullYear();
    const cycleMonth = previousCycle.start.getMonth();
    
    // Double bonus period: 23rd to 28th of the cycle month
    const doubleBonusStart = new Date(cycleYear, cycleMonth, 23);
    const doubleBonusEnd = new Date(cycleYear, cycleMonth, 28, 23, 59, 59);
    
    const doubleBonusDailyBreakdown: DoubleBonusDayStats[] = [];
    let doubleBonusTotal = 0;
    const DOUBLE_BONUS_TARGET = 24000;
    
    // Filter earnings that fall within double bonus period
    for (const day of dailyEarnings) {
      const dayDate = new Date(day.fullDate);
      if (dayDate >= doubleBonusStart && dayDate <= doubleBonusEnd) {
        doubleBonusDailyBreakdown.push({
          date: day.date,
          fullDate: day.fullDate,
          amount: day.amount
        });
        doubleBonusTotal += day.amount;
      }
    }
    
    // Sort by date for display
    doubleBonusDailyBreakdown.sort((a, b) => a.fullDate - b.fullDate);
    
    if (doubleBonusDailyBreakdown.length > 0) {
      const percentOfTarget = Math.round((doubleBonusTotal / DOUBLE_BONUS_TARGET) * 100);
      
      let achievementLevel: DoubleBonusPeriodData['achievementLevel'];
      if (percentOfTarget >= 100) {
        achievementLevel = doubleBonusTotal > DOUBLE_BONUS_TARGET ? 'exceeded' : 'achieved';
      } else if (percentOfTarget >= 75) {
        achievementLevel = 'close';
      } else {
        achievementLevel = 'needs-work';
      }
      
      doubleBonusPeriod = {
        startDate: doubleBonusStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        endDate: doubleBonusEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        totalEarned: doubleBonusTotal,
        targetAmount: DOUBLE_BONUS_TARGET,
        dailyBreakdown: doubleBonusDailyBreakdown,
        achievementLevel,
        percentOfTarget
      };
    }

    // Mock stage ranking data (in a real app, this would come from backend)
    // Use totalBonus as a seed for deterministic "random" values
    const stageRanking = totalBonus > 0 ? (() => {
      // Generate deterministic values based on totalBonus
      const seed = totalBonus % 100;
      const rank = Math.max(1, (seed % 50) + 1);
      const totalInStage = 100 + (seed % 80);
      const peopleBehind = totalInStage - rank;
      const percentile = Math.round((peopleBehind / totalInStage) * 100);
      
      return {
        rank,
        totalInStage,
        percentile,
        stageName: 'Stage 2'
      };
    })() : null;

    return {
      previousCycle,
      totalBonus,
      bestDays, // Top 3 best days
      worstDays, // Bottom 3 worst days
      activeDays,
      inactiveDays: Math.max(0, inactiveDays),
      totalCycleDays,
      rankingBonusTotal,
      rankingBonusActiveDays: rankingBonusDaysSet.size,
      hasRankingBonusData: rankingBonusResults.length > 0,
      hasDailyPerformanceData: dailyPerformanceResults.length > 0,
      doubleBonusPeriod,
      stageRanking
    };
  }, [results, previousCycle]);

  // Check if we should show the animated summary
  const shouldShowAnimatedSummary = useMemo(() => {
    // Must have data
    if (!summaryData) return false;
    
    // Must be in a new cycle (day 16 or later)
    if (!isInNewCycle()) return false;
    
    // Must not have seen it already
    if (hasSeenSummary(currentCycleKey)) return false;
    
    // Must have at least some data to show
    if (summaryData.totalBonus === 0 && summaryData.rankingBonusTotal === 0) return false;

    return true;
  }, [summaryData, currentCycleKey]);

  const markAsShown = useCallback(() => {
    markSummaryAsSeen(currentCycleKey);
  }, [currentCycleKey]);

  return {
    summaryData,
    shouldShowAnimatedSummary,
    markAsShown
  };
}
