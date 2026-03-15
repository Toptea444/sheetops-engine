import { isDateInCycle, getPreviousCycles, type CyclePeriod } from '@/lib/cycleUtils';
import type { BonusResult } from '@/types/bonus';

export interface DaySummary {
  date: Date;
  bonus: number;
  rankingBonus: number;
}

export interface PreviousCycleSummary {
  cycle: CyclePeriod;
  totalBonus: number;
  totalRankingBonus: number;
  bonusDays: number;
  noBonusDays: number;
  bestDays: DaySummary[];
  worstDays: DaySummary[];
  allDays: DaySummary[];
  rankingBestDay: DaySummary | null;
  rankingActiveDays: number;
  rankingAveragePerActiveDay: number;
}

const isDailyPerformanceSheet = (name: string): boolean => {
  const upper = name.toUpperCase();
  return upper.includes('DAILY') || upper.includes('PERFORMANCE');
};

const isRankingBonusSheet = (name: string): boolean => {
  const normalized = name.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return normalized.includes('RANKINGBONUS') || (normalized.includes('RANKING') && normalized.includes('BONUS'));
};

export function buildPreviousCycleSummary(results: BonusResult[], selectedSheets: string[], referenceDate = new Date()): PreviousCycleSummary {
  const previousCycle = getPreviousCycles(1, referenceDate)[0];

  const bonusByDay = new Map<number, number>();
  const rankingByDay = new Map<number, number>();

  results.forEach((result) => {
    if (result.valueType === 'percent') return;
    const sheetName = result.sheetName || '';
    if (sheetName && !selectedSheets.includes(sheetName)) return;

    const useForBonus = isDailyPerformanceSheet(sheetName);
    const useForRanking = isRankingBonusSheet(sheetName);

    if (!useForBonus && !useForRanking) return;

    result.dailyBreakdown?.forEach((day) => {
      if (day.fullDate === undefined) return;
      const date = new Date(day.fullDate);
      if (!isDateInCycle(date, previousCycle)) return;

      if (useForBonus) {
        bonusByDay.set(day.fullDate, (bonusByDay.get(day.fullDate) || 0) + day.value);
      }

      if (useForRanking) {
        rankingByDay.set(day.fullDate, (rankingByDay.get(day.fullDate) || 0) + day.value);
      }
    });
  });

  const allDays: DaySummary[] = [];
  const cursor = new Date(previousCycle.startDate);

  while (cursor <= previousCycle.endDate) {
    const key = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate()).getTime();
    const bonus = bonusByDay.get(key) || 0;
    const rankingBonus = rankingByDay.get(key) || 0;
    allDays.push({
      date: new Date(cursor),
      bonus,
      rankingBonus,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  const totalBonus = allDays.reduce((sum, day) => sum + day.bonus, 0);
  const totalRankingBonus = allDays.reduce((sum, day) => sum + day.rankingBonus, 0);

  const positiveBonusDays = allDays.filter((day) => day.bonus > 0);
  const bestDays = [...positiveBonusDays].sort((a, b) => b.bonus - a.bonus).slice(0, 3);
  const worstDays = [...positiveBonusDays].sort((a, b) => a.bonus - b.bonus).slice(0, 3);

  const rankingPositiveDays = allDays.filter((day) => day.rankingBonus > 0);
  const rankingBestDay = rankingPositiveDays.length > 0
    ? [...rankingPositiveDays].sort((a, b) => b.rankingBonus - a.rankingBonus)[0]
    : null;

  return {
    cycle: previousCycle,
    totalBonus,
    totalRankingBonus,
    bonusDays: positiveBonusDays.length,
    noBonusDays: allDays.length - positiveBonusDays.length,
    bestDays,
    worstDays,
    allDays,
    rankingBestDay,
    rankingActiveDays: rankingPositiveDays.length,
    rankingAveragePerActiveDay: rankingPositiveDays.length > 0
      ? totalRankingBonus / rankingPositiveDays.length
      : 0,
  };
}
