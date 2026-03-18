import { useMemo, useCallback } from 'react';
import type { BonusResult, DailyBonus } from '@/types/bonus';
import type { CyclePeriod } from '@/lib/cycleUtils';
import { 
  getPreviousCycle, 
  isDateInCycle, 
  getCycleKey,
  getTotalDaysInCycle,
  isInNewCycle,
  getCurrentCycle
} from '@/lib/cycleUtils';

// ─── Types ───────────────────────────────────────────────────
export interface DayStats {
  date: string;
  fullDate: number;
  amount: number;
}



interface DoubleBonusPeriodData {
  startLabel: string;
  endLabel: string;
  maxPossible: number;
  totalEarned: number;
  daysWithEarnings: number;
  breakdown: DayStats[];
  progressPercent: number;
  attemptStatus: 'none' | 'tried' | 'strong' | 'maxed';
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
  doubleBonusPeriod: DoubleBonusPeriodData;
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


const DOUBLE_BONUS_PERIOD = {
  startMonth: 1, // February (0-indexed)
  startDay: 23,
  endMonth: 1,
  endDay: 28,
  maxPossible: 24000,
};

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

    // Aggregate daily earnings from Daily & Performance sheets for previous cycle.
    // Key by normalized fullDate (midnight timestamp) to avoid collisions from
    // formatted date strings (e.g. "Jan 16, Thu") which can differ across results,
    // and to correctly merge same-day entries across multiple sheets without
    // double-counting days that appear in two result entries for the same sheet
    // (which happens for swap users who have one result per worker ID per sheet).
    const dailyEarningsMap = new Map<number, DayStats>();

    for (const result of dailyPerformanceResults) {
      // Track which normalized dates we've already seen from THIS result entry,
      // so we don't double-count if the same date somehow appears twice within one result.
      const seenInThisResult = new Set<number>();

      for (const day of result.dailyBreakdown || []) {
        if (!day.fullDate) continue;
        
        const dayDate = new Date(day.fullDate);
        if (!isDateInCycle(dayDate, previousCycle)) continue;

        // Normalize to midnight for a stable key
        const normalizedKey = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate()).getTime();

        // Skip duplicate dates within the same result entry
        if (seenInThisResult.has(normalizedKey)) continue;
        seenInThisResult.add(normalizedKey);

        const existing = dailyEarningsMap.get(normalizedKey);
        
        if (existing) {
          existing.amount += day.value || 0;
        } else {
          dailyEarningsMap.set(normalizedKey, {
            date: day.date,
            fullDate: day.fullDate,
            amount: day.value || 0
          });
        }
      }
    }

    // Calculate ranking bonus stats for previous cycle
    let rankingBonusTotal = 0;
    const rankingBonusDaysSet = new Set<number>(); // keyed by normalized midnight timestamp

    for (const result of rankingBonusResults) {
      const seenInThisResult = new Set<number>();

      for (const day of result.dailyBreakdown || []) {
        if (!day.fullDate) continue;
        
        const dayDate = new Date(day.fullDate);
        if (!isDateInCycle(dayDate, previousCycle)) continue;

        const normalizedKey = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate()).getTime();
        if (seenInThisResult.has(normalizedKey)) continue;
        seenInThisResult.add(normalizedKey);

        if (day.value > 0) {
          rankingBonusTotal += day.value;
          rankingBonusDaysSet.add(normalizedKey);
        }
      }
    }

    // Convert to array and sort
    const dailyEarnings = Array.from(dailyEarningsMap.values());

    const periodYear = previousCycle.endDate.getFullYear();
    const doubleBonusStart = new Date(periodYear, DOUBLE_BONUS_PERIOD.startMonth, DOUBLE_BONUS_PERIOD.startDay);
    doubleBonusStart.setHours(0, 0, 0, 0);
    const doubleBonusEnd = new Date(periodYear, DOUBLE_BONUS_PERIOD.endMonth, DOUBLE_BONUS_PERIOD.endDay);
    doubleBonusEnd.setHours(23, 59, 59, 999);

    const doubleBonusBreakdown = dailyEarnings
      .filter((day) => {
        const dayDate = new Date(day.fullDate);
        return dayDate >= doubleBonusStart && dayDate <= doubleBonusEnd;
      })
      .sort((a, b) => a.fullDate - b.fullDate);

    const doubleBonusTotal = doubleBonusBreakdown.reduce((sum, day) => sum + day.amount, 0);
    const doubleBonusProgress = Math.min(100, Math.round((doubleBonusTotal / DOUBLE_BONUS_PERIOD.maxPossible) * 100));

    let doubleBonusAttemptStatus: DoubleBonusPeriodData['attemptStatus'] = 'none';
    if (doubleBonusTotal >= DOUBLE_BONUS_PERIOD.maxPossible) {
      doubleBonusAttemptStatus = 'maxed';
    } else if (doubleBonusTotal >= DOUBLE_BONUS_PERIOD.maxPossible * 0.5) {
      doubleBonusAttemptStatus = 'strong';
    } else if (doubleBonusTotal > 0) {
      doubleBonusAttemptStatus = 'tried';
    }
    
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
      doubleBonusPeriod: {
        startLabel: 'Feb 23',
        endLabel: 'Feb 28',
        maxPossible: DOUBLE_BONUS_PERIOD.maxPossible,
        totalEarned: doubleBonusTotal,
        daysWithEarnings: doubleBonusBreakdown.filter((day) => day.amount > 0).length,
        breakdown: doubleBonusBreakdown,
        progressPercent: doubleBonusProgress,
        attemptStatus: doubleBonusAttemptStatus,
      },
    };
  }, [results, previousCycle]);

  // Check if we should show the animated summary
  const shouldShowAnimatedSummary = useMemo(() => {
    // Must have data
    if (!summaryData) return false;

    // Only auto-play on the current cycle dashboard view.
    // If users manually switch to an older cycle, showing another animation feels
    // like a duplicate/incorrect recap because the reference cycle shifts again.
    const isViewingCurrentCycle = getCycleKey(currentCycle) === getCycleKey(getCurrentCycle());
    if (!isViewingCurrentCycle) return false;
    
    // Must be in a new cycle (day 16 or later)
    if (!isInNewCycle()) return false;
    
    // Must not have seen it already
    if (hasSeenSummary(currentCycleKey)) return false;
    
    // Must have at least some data to show
    if (summaryData.totalBonus === 0 && summaryData.rankingBonusTotal === 0) return false;

    return true;
  }, [summaryData, currentCycle, currentCycleKey]);

  const markAsShown = useCallback(() => {
    markSummaryAsSeen(currentCycleKey);
  }, [currentCycleKey]);

  return {
    summaryData,
    shouldShowAnimatedSummary,
    markAsShown
  };
}
