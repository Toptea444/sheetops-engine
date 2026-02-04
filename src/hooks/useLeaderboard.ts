import { useMemo } from 'react';
import type { SheetData, DailyBonus } from '@/types/bonus';
import type { CyclePeriod } from '@/lib/cycleUtils';

export interface LeaderboardEntry {
  rank: number;
  workerId: string;
  stage: string;
  total: number;
  isCurrentUser: boolean;
  rankChange?: number; // Positive = moved up, negative = moved down, 0 = same, undefined = new
}

export interface WeekPeriod {
  startDate: Date;
  endDate: Date;
  label: string;
  weekNumber: number;
}

/**
 * Get weeks within a cycle using a smarter approach:
 * - Week 1: 16th to first Saturday (partial week, 1-7 days)
 * - Subsequent weeks: Full Sun-Sat weeks
 * - Last week ends on 15th
 */
export function getWeeksInCycle(cycle: CyclePeriod): WeekPeriod[] {
  const weeks: WeekPeriod[] = [];
  const cycleEnd = new Date(cycle.endDate);
  let current = new Date(cycle.startDate);
  let weekNumber = 1;

  while (current <= cycleEnd) {
    let weekStart = new Date(current);
    let weekEnd: Date;
    
    const dayOfWeek = weekStart.getDay(); // 0 = Sunday
    
    if (weekNumber === 1) {
      // First week: from 16th to the first Saturday
      const daysUntilSat = (6 - dayOfWeek + 7) % 7;
      weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + daysUntilSat);
    } else {
      // Subsequent weeks: full Sun-Sat
      const daysUntilSat = 6 - dayOfWeek;
      weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + daysUntilSat);
    }
    
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

    // Move to next day (Sunday)
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
  today.setHours(0, 0, 0, 0);
  
  for (const week of weeks) {
    const startTime = new Date(week.startDate).setHours(0, 0, 0, 0);
    const endTime = new Date(week.endDate).setHours(23, 59, 59, 999);
    const todayTime = today.getTime();
    
    if (todayTime >= startTime && todayTime <= endTime) {
      return week;
    }
  }
  
  // Return last week if past cycle
  return weeks[weeks.length - 1] || null;
}

function normalizeComparable(value: string): string {
  // Be extra tolerant: users sometimes copy/paste IDs with hidden chars or punctuation.
  // Keep only alphanumerics so matching works reliably across sheets.
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
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
  dailyData: { date: string; dayNumber: number; timestamp: number; value: number }[];
}

export interface LeaderboardDataInfo {
  latestDataDate: Date | null;
  totalDaysWithData: number;
  foundTimestamps: Set<number>;
}

/**
 * Parse date from cell (matches the logic in useGoogleSheets)
 */
function parseDateFromCell(cell: string, sheetName: string): { day: number; timestamp: number } | null {
  const trimmed = cell.trim();
  if (!trimmed) return null;
  
  // Ignore collector bonus headers
  if (trimmed.toUpperCase().includes('COLLECTOR BONUS')) return null;
  
  // Try MM/DD/YYYY or M/D/YYYY format
  const slashMatch = trimmed.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    const month = parseInt(slashMatch[1], 10);
    const day = parseInt(slashMatch[2], 10);
    const year = parseInt(slashMatch[3], 10);
    const date = new Date(year, month - 1, day);
    return { day, timestamp: date.getTime() };
  }
  
  // Try "1ST JAN 2026" or "16TH JAN" format
  const ordinalMatch = trimmed.match(/(\d{1,2})(st|nd|rd|th)?\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s*(\d{4})?/i);
  if (ordinalMatch) {
    const day = parseInt(ordinalMatch[1], 10);
    const monthStr = ordinalMatch[3].toLowerCase();
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const month = months.indexOf(monthStr);
    const year = ordinalMatch[4] ? parseInt(ordinalMatch[4], 10) : new Date().getFullYear();
    const date = new Date(year, month, day);
    return { day, timestamp: date.getTime() };
  }
  
  return null;
}

function findLabelInRange(row: string[], start: number, end: number, labels: string[]): number {
  for (let i = start; i < end && i < row.length; i++) {
    const cell = (row[i] || '').toString().toLowerCase().trim();
    if (labels.some(l => cell === l || cell.includes(l))) {
      return i;
    }
  }
  return -1;
}

/**
 * Normalize stage for comparison (handles S1, S-1, S 1, etc.)
 */
function normalizeStage(stage: string): string {
  const compact = stage.toUpperCase().replace(/[\s\-_]/g, '');

  // Normalize "STAGE 1" / "STAGE-1" to "S1" so it matches users labeled as "S1".
  if (compact.startsWith('STAGE')) {
    const n = compact.replace(/^STAGE/, '');
    if (n) return `S${n}`;
  }

  return compact;
}

/**
 * Parse all workers from a Daily & Performance style sheet
 * Scans all rows to find date blocks (matching the main parser logic)
 */
function parseAllWorkersFromSheet(data: SheetData, cycle: CyclePeriod): { workers: WorkerAggregate[]; dataInfo: LeaderboardDataInfo } {
  const workers = new Map<string, WorkerAggregate>();
  const foundTimestamps = new Set<number>();
  
  if (!data || data.rows.length === 0) {
    return { workers: [], dataInfo: { latestDataDate: null, totalDaysWithData: 0, foundTimestamps: new Set() } };
  }

  const matrix = [data.headers, ...data.rows];

  // Scan all rows to find date blocks (same approach as parseDailyPerformanceSheet)
  for (let rowIdx = 0; rowIdx < matrix.length - 2; rowIdx++) {
    const row = matrix[rowIdx] || [];

    // Find date-like cells on this row
    const dateStarts: { col: number; day: number; timestamp: number }[] = [];
    
    for (let col = 0; col < row.length; col++) {
      const cell = String(row[col] ?? '').trim();
      if (!cell) continue;
      
      const parsed = parseDateFromCell(cell, data.sheetName);
      if (parsed) {
        dateStarts.push({ col, day: parsed.day, timestamp: parsed.timestamp });
      }
    }

    if (dateStarts.length === 0) continue;
    dateStarts.sort((a, b) => a.col - b.col);

    // The next row should be the header row
    const headerRow = matrix[rowIdx + 1] || [];

    // Process each date block
    for (let sIdx = 0; sIdx < dateStarts.length; sIdx++) {
      const blockStart = dateStarts[sIdx].col;
      const blockEnd = dateStarts[sIdx + 1]?.col ?? Math.max(row.length, headerRow.length);
      const dayNumber = dateStarts[sIdx].day;
      const timestamp = dateStarts[sIdx].timestamp;

      // Find columns within this block
      const stagesCol = findLabelInRange(headerRow, blockStart, blockEnd, ['stages', 'stage']);
      const usernamesCol = findLabelInRange(headerRow, blockStart, blockEnd, ['usernames', 'username', 'product', 'id', 'name', 'names']);
      // Try TOTAL first, then RANKING BONUS for ranking-style sheets
      let valueCol = findLabelInRange(headerRow, blockStart, blockEnd, ['total']);
      if (valueCol < 0) {
        valueCol = findLabelInRange(headerRow, blockStart, blockEnd, ['ranking bonus']);
      }

      if (usernamesCol < 0 || valueCol < 0) continue;
      
      foundTimestamps.add(timestamp);

      let currentStage = '';

      // Scan data rows
      for (let r = rowIdx + 2; r < matrix.length; r++) {
        const dataRow = matrix[r] || [];
        const stageCell = String(dataRow[stagesCol] ?? '').trim();
        const userCell = String(dataRow[usernamesCol] ?? '').trim();

        // Check if we've hit another date block
        if (parseDateFromCell(String(dataRow[blockStart] ?? ''), data.sheetName)) {
          break;
        }

        // Stage divider row
        if (stageCell && !userCell && looksLikeStage(stageCell)) {
          currentStage = stageCell;
          continue;
        }

        if (!userCell) continue;

        const normalizedId = normalizeComparable(userCell);
        const totalValue = parseNumberLike(dataRow[valueCol]);
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
          date: `Day ${dayNumber}`,
          dayNumber,
          timestamp,
          value: totalValue,
        });
      }
    }
  }

  // Calculate latest data date
  let latestDataDate: Date | null = null;
  const sortedTimestamps = Array.from(foundTimestamps).sort((a, b) => a - b);
  
  if (sortedTimestamps.length > 0) {
    latestDataDate = new Date(sortedTimestamps[sortedTimestamps.length - 1]);
  }

  return { 
    workers: Array.from(workers.values()), 
    dataInfo: { 
      latestDataDate, 
      totalDaysWithData: foundTimestamps.size,
      foundTimestamps,
    }
  };
}

export interface UseLeaderboardOptions {
  sheetData: SheetData | null;
  currentUserId: string | null;
  currentUserName?: string | null;
  userStage: string | null;
  cycle: CyclePeriod;
  mode: 'week' | 'cycle';
  selectedWeek?: WeekPeriod | null;
}

export interface UseLeaderboardResult {
  leaderboard: LeaderboardEntry[];
  currentUserRank: number | null;
  totalParticipants: number;
  dataInfo: LeaderboardDataInfo;
  weekHasData: boolean;
}

export function useLeaderboard({
  sheetData,
  currentUserId,
  currentUserName,
  userStage,
  cycle,
  mode,
  selectedWeek,
}: UseLeaderboardOptions): UseLeaderboardResult {
  const { workers: allWorkers, dataInfo } = useMemo(() => {
    if (!sheetData) return { workers: [], dataInfo: { latestDataDate: null, totalDaysWithData: 0, foundTimestamps: new Set<number>() } };
    return parseAllWorkersFromSheet(sheetData, cycle);
  }, [sheetData, cycle]);

  // Check if selected week has any data (check if week start date exists in found timestamps)
  const weekHasData = useMemo(() => {
    if (mode !== 'week' || !selectedWeek) return true;
    
    // Check if any timestamp from the data falls within this week
    const weekStart = new Date(selectedWeek.startDate).setHours(0, 0, 0, 0);
    const weekEnd = new Date(selectedWeek.endDate).setHours(23, 59, 59, 999);
    
    for (const ts of dataInfo.foundTimestamps) {
      if (ts >= weekStart && ts <= weekEnd) {
        return true;
      }
    }
    return false;
  }, [mode, selectedWeek, dataInfo.foundTimestamps]);

  // Filter to same stage as user (using normalizeStage for better matching)
  const sameStageWorkers = useMemo(() => {
    if (!userStage) return allWorkers;
    const normalizedUserStage = normalizeStage(userStage);
    return allWorkers.filter(w => normalizeStage(w.stage) === normalizedUserStage);
  }, [allWorkers, userStage]);

  // Calculate totals for a given week period
  const calculateRankingsForPeriod = (week: WeekPeriod | null, forCycle: boolean): Map<string, number> => {
    const rankings = new Map<string, number>();
    const entries: { workerId: string; total: number }[] = [];

    for (const worker of sameStageWorkers) {
      let total = 0;

      for (const day of worker.dailyData) {
        const dayDate = new Date(day.timestamp);
        dayDate.setHours(0, 0, 0, 0);

        if (forCycle) {
          total += day.value;
        } else if (week) {
          const dayTime = dayDate.getTime();
          const weekStart = new Date(week.startDate).setHours(0, 0, 0, 0);
          const weekEnd = new Date(week.endDate).setHours(23, 59, 59, 999);
          
          if (dayTime >= weekStart && dayTime <= weekEnd) {
            total += day.value;
          }
        }
      }

      entries.push({ workerId: normalizeComparable(worker.workerId), total });
    }

    entries.sort((a, b) => b.total - a.total);
    entries.forEach((entry, index) => {
      rankings.set(entry.workerId, index + 1);
    });

    return rankings;
  };

  // Get previous week for comparison
  const previousWeek = useMemo((): WeekPeriod | null => {
    if (mode !== 'week' || !selectedWeek) return null;
    const weeks = getWeeksInCycle(cycle);
    const currentIdx = weeks.findIndex(w => w.weekNumber === selectedWeek.weekNumber);
    if (currentIdx <= 0) return null;
    return weeks[currentIdx - 1];
  }, [mode, selectedWeek, cycle]);

  // Calculate previous period rankings
  const previousRankings = useMemo((): Map<string, number> => {
    if (mode === 'week' && previousWeek) {
      return calculateRankingsForPeriod(previousWeek, false);
    }
    // For cycle mode, we don't have a "previous" period to compare
    return new Map();
  }, [sameStageWorkers, mode, previousWeek]);

  // Calculate totals based on mode
  const leaderboard = useMemo((): LeaderboardEntry[] => {
    const entries: { workerId: string; stage: string; total: number; isCurrentUser: boolean }[] = [];
    const normalizedCurrentUserIds = new Set(
      [currentUserId, currentUserName]
        .filter(Boolean)
        .map((v) => normalizeComparable(String(v)))
    );

    for (const worker of sameStageWorkers) {
      let total = 0;

      for (const day of worker.dailyData) {
        const dayDate = new Date(day.timestamp);
        dayDate.setHours(0, 0, 0, 0);

        if (mode === 'cycle') {
          total += day.value;
        } else if (mode === 'week' && selectedWeek) {
          const dayTime = dayDate.getTime();
          const weekStart = new Date(selectedWeek.startDate).setHours(0, 0, 0, 0);
          const weekEnd = new Date(selectedWeek.endDate).setHours(23, 59, 59, 999);
          
          if (dayTime >= weekStart && dayTime <= weekEnd) {
            total += day.value;
          }
        }
      }

      entries.push({
        workerId: worker.workerId,
        stage: worker.stage,
        total,
        isCurrentUser: normalizedCurrentUserIds.has(normalizeComparable(worker.workerId)),
      });
    }

    // Sort by total descending
    entries.sort((a, b) => b.total - a.total);

    // Add ranks and rank changes
    return entries.map((entry, index) => {
      const currentRank = index + 1;
      const normalizedId = normalizeComparable(entry.workerId);
      const prevRank = previousRankings.get(normalizedId);
      
      let rankChange: number | undefined;
      if (mode === 'week' && previousWeek) {
        if (prevRank !== undefined) {
          rankChange = prevRank - currentRank; // Positive = moved up
        }
        // undefined means new entry (no previous data)
      }

      return {
        ...entry,
        rank: currentRank,
        rankChange,
      };
    });
  }, [sameStageWorkers, currentUserId, currentUserName, cycle, mode, selectedWeek, previousRankings, previousWeek]);

  const currentUserRank = useMemo(() => {
    return leaderboard.find(e => e.isCurrentUser)?.rank ?? null;
  }, [leaderboard]);

  const totalParticipants = leaderboard.length;

  return {
    leaderboard,
    currentUserRank,
    totalParticipants,
    dataInfo,
    weekHasData,
  };
}
