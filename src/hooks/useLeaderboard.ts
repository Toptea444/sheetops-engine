import { useMemo } from 'react';
import type { SheetData, DailyBonus } from '@/types/bonus';
import type { CyclePeriod } from '@/lib/cycleUtils';
import { isDateInCycle } from '@/lib/cycleUtils';

export interface LeaderboardEntry {
  rank: number;
  workerId: string;
  stage: string;
  total: number;
  isCurrentUser: boolean;
}

export interface WeekPeriod {
  startDate: Date;
  endDate: Date;
  label: string;
  weekNumber: number;
}

/**
 * Get weeks within a cycle (Sunday-Saturday).
 * Last week ends on 15th even if < 7 days.
 */
export function getWeeksInCycle(cycle: CyclePeriod): WeekPeriod[] {
  const weeks: WeekPeriod[] = [];
  const cycleEnd = new Date(cycle.endDate);
  let current = new Date(cycle.startDate);
  let weekNumber = 1;

  while (current <= cycleEnd) {
    // Find next Sunday or use cycle start
    let weekStart = new Date(current);
    
    // If not Sunday, this is a partial first week - just use the current date
    // Otherwise use current date as start
    
    // Find the Saturday (or cycle end)
    let weekEnd: Date;
    
    const dayOfWeek = weekStart.getDay(); // 0 = Sunday
    const daysUntilSat = 6 - dayOfWeek;
    
    weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + daysUntilSat);
    
    // Cap at cycle end (15th)
    if (weekEnd > cycleEnd) {
      weekEnd = new Date(cycleEnd);
    }

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    weeks.push({
      startDate: weekStart,
      endDate: weekEnd,
      label: `${months[weekStart.getMonth()]} ${weekStart.getDate()} - ${months[weekEnd.getMonth()]} ${weekEnd.getDate()}`,
      weekNumber,
    });

    // Move to next Sunday
    current = new Date(weekEnd);
    current.setDate(current.getDate() + 1);
    weekNumber++;
  }

  return weeks;
}

/**
 * Get current week within the cycle
 */
export function getCurrentWeekInCycle(cycle: CyclePeriod): WeekPeriod | null {
  const weeks = getWeeksInCycle(cycle);
  const today = new Date();
  
  for (const week of weeks) {
    const startTime = week.startDate.getTime();
    const endTime = new Date(week.endDate.getFullYear(), week.endDate.getMonth(), week.endDate.getDate(), 23, 59, 59).getTime();
    const todayTime = today.getTime();
    
    if (todayTime >= startTime && todayTime <= endTime) {
      return week;
    }
  }
  
  // Return last week if past cycle
  return weeks[weeks.length - 1] || null;
}

function normalizeComparable(value: string): string {
  return value.toUpperCase().replace(/[\s\-_]/g, '');
}

function normalizeLabel(s: string): string {
  return (s || '').toString().toLowerCase().trim();
}

function parseNumberLike(cell: string | undefined): number {
  if (!cell) return 0;
  const cleaned = String(cell).replace(/[^0-9.\-]/g, '');
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function looksLikeStage(val: string): boolean {
  const v = val.toUpperCase().trim();
  return /^[ST]\-?\d+$/i.test(v) || /^STAGE/i.test(v);
}

interface WorkerAggregate {
  workerId: string;
  stage: string;
  dailyData: { date: string; fullDate: number; value: number }[];
}

/**
 * Parse all workers from a Daily & Performance style sheet
 */
function parseAllWorkersFromSheet(data: SheetData): WorkerAggregate[] {
  const workers = new Map<string, WorkerAggregate>();
  
  if (!data || data.rows.length === 0) return [];

  const matrix = [data.headers, ...data.rows];
  const dateStarts: { col: number; date: string; timestamp: number; day: number }[] = [];

  // Find date columns (looking for day numbers like 16, 17, 18, etc.)
  const firstRow = matrix[0] || [];
  for (let c = 0; c < firstRow.length; c++) {
    const cell = String(firstRow[c] || '').trim();
    const dayNum = parseInt(cell, 10);
    if (dayNum >= 1 && dayNum <= 31) {
      // Infer month/year from sheet name or use current
      const now = new Date();
      const timestamp = new Date(now.getFullYear(), now.getMonth(), dayNum).getTime();
      dateStarts.push({
        col: c,
        date: `Day ${dayNum}`,
        timestamp,
        day: dayNum,
      });
    }
  }

  if (dateStarts.length === 0) return [];

  // Find header row (usually row 1 after the date row)
  const headerRowIdx = 1;
  if (headerRowIdx >= matrix.length) return [];
  const headerRow = matrix[headerRowIdx];

  // Process each date block
  for (let sIdx = 0; sIdx < dateStarts.length; sIdx++) {
    const blockStart = dateStarts[sIdx].col;
    const blockEnd = dateStarts[sIdx + 1]?.col ?? Math.max(firstRow.length, headerRow.length);

    // Find columns within this block
    let stagesCol = -1;
    let usernamesCol = -1;
    let totalCol = -1;

    for (let i = blockStart; i < blockEnd && i < headerRow.length; i++) {
      const cell = normalizeLabel(headerRow[i]);
      if (!cell) continue;
      
      if (stagesCol < 0 && (cell === 'stages' || cell === 'stage' || cell.includes('stage'))) {
        stagesCol = i;
      }
      if (usernamesCol < 0 && (cell === 'usernames' || cell === 'username' || cell === 'product' || cell === 'id' || cell.includes('name'))) {
        usernamesCol = i;
      }
      if (totalCol < 0 && cell === 'total') {
        totalCol = i;
      }
    }

    if (usernamesCol < 0 || totalCol < 0) continue;

    let currentStage = '';

    // Scan data rows
    for (let r = headerRowIdx + 1; r < matrix.length; r++) {
      const row = matrix[r] || [];
      const stageCell = String(row[stagesCol] ?? '').trim();
      const userCell = String(row[usernamesCol] ?? '').trim();

      // Stage divider row
      if (stageCell && !userCell && looksLikeStage(stageCell)) {
        currentStage = stageCell;
        continue;
      }

      if (!userCell) continue;

      const normalizedId = normalizeComparable(userCell);
      const totalValue = parseNumberLike(row[totalCol]);
      const resolvedStage = stageCell || currentStage;

      if (!workers.has(normalizedId)) {
        workers.set(normalizedId, {
          workerId: userCell,
          stage: resolvedStage,
          dailyData: [],
        });
      }

      const worker = workers.get(normalizedId)!;
      if (!worker.stage && resolvedStage) {
        worker.stage = resolvedStage;
      }

      worker.dailyData.push({
        date: dateStarts[sIdx].date,
        fullDate: dateStarts[sIdx].timestamp,
        value: totalValue,
      });
    }
  }

  return Array.from(workers.values());
}

export interface UseLeaderboardOptions {
  sheetData: SheetData | null;
  currentUserId: string | null;
  userStage: string | null;
  cycle: CyclePeriod;
  mode: 'week' | 'cycle';
  selectedWeek?: WeekPeriod | null;
}

export function useLeaderboard({
  sheetData,
  currentUserId,
  userStage,
  cycle,
  mode,
  selectedWeek,
}: UseLeaderboardOptions) {
  const allWorkers = useMemo(() => {
    if (!sheetData) return [];
    return parseAllWorkersFromSheet(sheetData);
  }, [sheetData]);

  // Filter to same stage as user
  const sameStageWorkers = useMemo(() => {
    if (!userStage) return allWorkers;
    const normalizedStage = normalizeComparable(userStage);
    return allWorkers.filter(w => normalizeComparable(w.stage) === normalizedStage);
  }, [allWorkers, userStage]);

  // Calculate totals based on mode
  const leaderboard = useMemo((): LeaderboardEntry[] => {
    const entries: { workerId: string; stage: string; total: number; isCurrentUser: boolean }[] = [];
    const normalizedCurrentUser = currentUserId ? normalizeComparable(currentUserId) : '';

    for (const worker of sameStageWorkers) {
      let total = 0;

      for (const day of worker.dailyData) {
        const dayDate = new Date(day.fullDate);

        if (mode === 'cycle') {
          // Filter by cycle
          if (isDateInCycle(dayDate, cycle)) {
            total += day.value;
          }
        } else if (mode === 'week' && selectedWeek) {
          // Filter by week
          const dayTime = dayDate.getTime();
          const weekStart = selectedWeek.startDate.getTime();
          const weekEnd = new Date(selectedWeek.endDate.getFullYear(), selectedWeek.endDate.getMonth(), selectedWeek.endDate.getDate(), 23, 59, 59).getTime();
          
          if (dayTime >= weekStart && dayTime <= weekEnd) {
            total += day.value;
          }
        }
      }

      entries.push({
        workerId: worker.workerId,
        stage: worker.stage,
        total,
        isCurrentUser: normalizeComparable(worker.workerId) === normalizedCurrentUser,
      });
    }

    // Sort by total descending
    entries.sort((a, b) => b.total - a.total);

    // Add ranks
    return entries.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
  }, [sameStageWorkers, currentUserId, cycle, mode, selectedWeek]);

  const currentUserRank = useMemo(() => {
    return leaderboard.find(e => e.isCurrentUser)?.rank ?? null;
  }, [leaderboard]);

  const totalParticipants = leaderboard.length;

  return {
    leaderboard,
    currentUserRank,
    totalParticipants,
  };
}
