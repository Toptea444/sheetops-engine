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
    const sortedByAmount = [...dailyEarnings].sort((a, b) => b.amount - a.amount);
    
    // Get best day(s) - could be multiple with same amount
    const bestAmount = sortedByAmount[0]?.amount || 0;
    const bestDays = sortedByAmount.filter(d => d.amount === bestAmount && d.amount > 0);
    
    // Get worst day(s) - among days with earnings
    const daysWithEarnings = sortedByAmount.filter(d => d.amount > 0);
    const worstAmount = daysWithEarnings[daysWithEarnings.length - 1]?.amount || 0;
    const worstDays = daysWithEarnings.filter(d => d.amount === worstAmount);

    return {
      previousCycle,
      totalBonus,
      bestDays: bestDays.slice(0, 3), // Limit to top 3
      worstDays: worstDays.slice(0, 3), // Limit to top 3
      activeDays,
      inactiveDays: Math.max(0, inactiveDays),
      totalCycleDays,
      rankingBonusTotal,
      rankingBonusActiveDays: rankingBonusDaysSet.size,
      hasRankingBonusData: rankingBonusResults.length > 0,
      hasDailyPerformanceData: dailyPerformanceResults.length > 0
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
