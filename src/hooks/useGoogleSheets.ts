import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type {
  SheetInfo,
  SheetData,
  WorkerData,
  BonusResult,
  DailyBonus,
  BonusValueType,
} from '@/types/bonus';

const SPREADSHEET_ID = '1ikKuPzsD5yDNMLtO11r7OT9hFLffykzW6on0VGXBE20';

export function useGoogleSheets() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheets, setSheets] = useState<SheetInfo[]>([]);
  const [sheetData, setSheetData] = useState<SheetData | null>(null);

  const fetchSheets = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('fetch-google-sheets', {
        body: { action: 'getSheets', spreadsheetId: SPREADSHEET_ID },
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      const list: SheetInfo[] = data?.sheets || [];
      setSheets(list);
      return list;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch sheets';
      setError(message);
      return [] as SheetInfo[];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchSheetData = useCallback(async (sheetName: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('fetch-google-sheets', {
        body: { action: 'getSheetData', spreadsheetId: SPREADSHEET_ID, sheetName },
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      const result: SheetData = {
        headers: (data?.headers || []).map((h: unknown) => String(h ?? '')),
        rows: (data?.rows || []).map((row: unknown[]) => row.map((c) => String(c ?? ''))),
        sheetName,
      };

      setSheetData(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch sheet data';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const searchWorker = useCallback((data: SheetData, workerId: string): WorkerData | null => {
    if (!data || data.rows.length === 0) return null;

    const sheetName = data.sheetName.toUpperCase();
    const normalizedWorkerId = normalizeWorkerIdComparable(workerId);

    // Try DAILY & PERFORMANCE style parser first (horizontal blocks with day numbers)
    if (sheetName.includes('DAILY') || sheetName.includes('PERFORMANCE')) {
      const result = parseDailyPerformanceSheet(data, normalizedWorkerId, workerId);
      if (result) return result;
    }

    // Try RANKING BONUS style parser (date headers with vertical data)
    if (sheetName.includes('RANKING')) {
      const result = parseRankingBonusSheet(data, normalizedWorkerId, workerId);
      if (result) return result;
    }

    // Try WEEKLY BONUS style parser
    if (sheetName.includes('WEEKLY')) {
      const result = parseWeeklyBonusSheet(data, normalizedWorkerId, workerId);
      if (result) return result;
    }

    // Generic fallback: try all parsers
    const dailyResult = parseDailyPerformanceSheet(data, normalizedWorkerId, workerId);
    if (dailyResult) return dailyResult;

    const rankingResult = parseRankingBonusSheet(data, normalizedWorkerId, workerId);
    if (rankingResult) return rankingResult;

    const weeklyResult = parseWeeklyBonusSheet(data, normalizedWorkerId, workerId);
    if (weeklyResult) return weeklyResult;

    return null;
  }, []);

  // Get available day numbers from worker data
  const getAvailableDays = useCallback((worker: WorkerData): number[] => {
    return worker.dailyData
      .filter(d => d.dayNumber !== undefined)
      .map(d => d.dayNumber as number)
      .sort((a, b) => a - b);
  }, []);

  const calculateBonus = useCallback((worker: WorkerData, startDate: Date, endDate: Date): BonusResult => {
    // Helper to normalize a timestamp to midnight UTC for consistent comparison
    const normalizeToMidnight = (timestamp: number): number => {
      const d = new Date(timestamp);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    };

    // Normalize start/end dates to midnight for comparison
    const startTime = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime();
    const endTime = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()).getTime();

    // Get available full dates from worker data, normalized to midnight
    const availableDates = worker.dailyData
      .filter(d => d.fullDate !== undefined)
      .map(d => normalizeToMidnight(d.fullDate as number))
      .sort((a, b) => a - b);

    // Remove duplicates
    const uniqueAvailableDates = [...new Set(availableDates)];

    const minAvailableDate = uniqueAvailableDates.length > 0 ? Math.min(...uniqueAvailableDates) : null;
    const maxAvailableDate = uniqueAvailableDates.length > 0 ? Math.max(...uniqueAvailableDates) : null;

    // Validate dates against available data
    let adjustedStartTime = startTime;
    let adjustedEndTime = endTime;
    let dateWarning: string | undefined;

    // Check if requested dates are outside available range
    if (minAvailableDate !== null && maxAvailableDate !== null) {
      let warnings: string[] = [];

      // Adjust start date if before available data
      if (startTime < minAvailableDate) {
        adjustedStartTime = minAvailableDate;
        const minDate = new Date(minAvailableDate);
        warnings.push(`Start date adjusted to ${minDate.toLocaleDateString()} (earliest available)`);
      }

      // Adjust end date if after available data
      if (endTime > maxAvailableDate) {
        adjustedEndTime = maxAvailableDate;
        const maxDate = new Date(maxAvailableDate);
        const requestedEndStr = endDate.toLocaleDateString();
        warnings.push(`Data ended on ${maxDate.toLocaleDateString()}. Your end date (${requestedEndStr}) was not found in the sheet.`);
      }

      if (warnings.length > 0) {
        dateWarning = warnings.join(' | ');
      }
    }

    // Build daily breakdown for dates within the adjusted range that exist in the sheet
    const dailyBreakdown: DailyBonus[] = [];
    
    for (const d of worker.dailyData) {
      if (d.fullDate !== undefined) {
        // Normalize the data's fullDate for comparison
        const normalizedFullDate = normalizeToMidnight(d.fullDate);
        // Only include days that are within the adjusted range (inclusive on both ends)
        if (normalizedFullDate >= adjustedStartTime && normalizedFullDate <= adjustedEndTime) {
          dailyBreakdown.push({
            date: d.date,
            dayNumber: d.dayNumber,
            fullDate: d.fullDate,
            value: d.value,
          });
        }
      }
    }

    // Sort by date
    dailyBreakdown.sort((a, b) => (a.fullDate ?? 0) - (b.fullDate ?? 0));

    const totalBonus = dailyBreakdown.reduce((sum, d) => sum + d.value, 0);

    return {
      workerId: worker.workerId,
      userName: worker.userName,
      stage: worker.stage,
      bucket: worker.bucket,
      totalBonus,
      dailyBreakdown,
      dateRange: {
        start: startDate.toLocaleDateString(),
        end: endDate.toLocaleDateString(),
      },
      actualDateRange: dateWarning ? {
        start: new Date(adjustedStartTime).toLocaleDateString(),
        end: new Date(adjustedEndTime).toLocaleDateString(),
      } : undefined,
      dateWarning,
      valueType: worker.valueType ?? 'amount',
    };
  }, []);

  // Extract ALL workers from the sheet data (for Team Overview)
  const getAllWorkers = useCallback((data: SheetData): WorkerData[] => {
    if (!data || data.rows.length === 0) return [];

    const sheetName = data.sheetName.toUpperCase();
    const workers: WorkerData[] = [];
    const seenWorkerIds = new Set<string>();

    // Helper to add worker if not already seen
    const addWorker = (worker: WorkerData | null) => {
      if (!worker) return;
      const key = normalizeWorkerIdComparable(worker.workerId);
      if (!seenWorkerIds.has(key)) {
        seenWorkerIds.add(key);
        workers.push(worker);
      }
    };

    // Extract all unique worker IDs from the sheet first
    const workerIds = extractAllWorkerIds(data);
    
    // For each worker ID, use the existing search function to get their data
    for (const workerId of workerIds) {
      const normalizedId = normalizeWorkerIdComparable(workerId);
      
      if (sheetName.includes('DAILY') || sheetName.includes('PERFORMANCE')) {
        addWorker(parseDailyPerformanceSheet(data, normalizedId, workerId));
      } else if (sheetName.includes('RANKING')) {
        addWorker(parseRankingBonusSheet(data, normalizedId, workerId));
      } else if (sheetName.includes('WEEKLY')) {
        addWorker(parseWeeklyBonusSheet(data, normalizedId, workerId));
      } else {
        // Try all parsers
        addWorker(parseDailyPerformanceSheet(data, normalizedId, workerId));
        if (!seenWorkerIds.has(normalizedId)) {
          addWorker(parseRankingBonusSheet(data, normalizedId, workerId));
        }
        if (!seenWorkerIds.has(normalizedId)) {
          addWorker(parseWeeklyBonusSheet(data, normalizedId, workerId));
        }
      }
    }

    return workers;
  }, []);

  // Get date range from sheet data
  const getSheetDateRange = useCallback((data: SheetData): { start: Date; end: Date } | null => {
    if (!data || data.rows.length === 0) return null;

    const workers = getAllWorkers(data);
    if (workers.length === 0) return null;

    let minDate = Infinity;
    let maxDate = -Infinity;

    for (const worker of workers) {
      for (const day of worker.dailyData) {
        if (day.fullDate !== undefined) {
          minDate = Math.min(minDate, day.fullDate);
          maxDate = Math.max(maxDate, day.fullDate);
        }
      }
    }

    if (minDate === Infinity || maxDate === -Infinity) return null;

    return {
      start: new Date(minDate),
      end: new Date(maxDate),
    };
  }, [getAllWorkers]);

  return {
    isLoading,
    error,
    sheets,
    sheetData,
    fetchSheets,
    fetchSheetData,
    searchWorker,
    calculateBonus,
    getAvailableDays,
    getAllWorkers,
    getSheetDateRange,
  };
}

// Extract all unique worker IDs from sheet data
function extractAllWorkerIds(data: SheetData): string[] {
  const workerIds = new Set<string>();
  const matrix: string[][] = [data.headers, ...data.rows];

  // Scan all cells for worker ID patterns, but normalize to a single canonical form
  // so variants like "GHAS1001" and "GHAS-1001" dedupe correctly.
  for (const row of matrix) {
    for (const cell of row) {
      const normalized = normalizeWorkerIdForDisplay(cell);
      if (normalized) workerIds.add(normalized);
    }
  }

  return Array.from(workerIds);
}

// ============================================================================
// PARSER: DAILY & PERFORMANCE style sheets
// Structure: Headers contain DATES (like "1/1/2026", "12/28/2025") - these are the data blocks
// IGNORE any "COLLECTOR BONUS STANDARDS" blocks - they are not real data
// Each date block has columns: STAGES, USERNAMES, Recovery Rate of Amount, Bonus, Rank, Rate, Ranking Bonus, Total
// Worker IDs are in "USERNAMES" column, the bonus value is in "Total" column
// ============================================================================
function parseDailyPerformanceSheet(
  data: SheetData,
  normalizedWorkerId: string,
  originalWorkerId: string
): WorkerData | null {
  // NOTE:
  // Some sheets (like "DAILY & PERFORMANCE JAN.") have a large "COLLECTOR BONUS STANDARDS" section at the top.
  // The *real* daily data is in vertical blocks:
  //   Row A: DATE (e.g., 1/1/2026)
  //   Row B: STAGES | USERNAMES | ... | TOTAL
  //   Rows below: stage divider rows + user rows
  // So we must scan ROWS to find date blocks (not just data.headers).

  const dailyData: DailyBonus[] = [];
  let foundStage = '';
  let foundUserName = '';

  const looksLikeStage = (value: string) => {
    const v = value.trim().toUpperCase();
    return /\bT\s*-?\s*\d+\b/.test(v) || /\bS\s*-?\s*\d+\b/.test(v);
  };

  // Build a full matrix including the first header row from the API
  const matrix: string[][] = [data.headers, ...data.rows];

  // --------------------------------------------------------------------------
  // PASS 1 (preferred): Find date blocks in ROWS (date row + header row)
  // --------------------------------------------------------------------------
  for (let rowIdx = 0; rowIdx < matrix.length - 2; rowIdx++) {
    const row = matrix[rowIdx] || [];

    // Collect all date-like cells on this row (each is a block start)
    const starts: Array<{ col: number; dateRaw: string; parsed: { day: number; formatted: string; timestamp: number } }> = [];

    for (let col = 0; col < row.length; col++) {
      const cell = String(row[col] ?? '').trim();
      if (!cell) continue;

      // Explicitly ignore the standards tables
      if (cell.toUpperCase().includes('COLLECTOR BONUS')) continue;

      const parsed = parseDateFromHeader(cell, data.sheetName);
      if (parsed) starts.push({ col, dateRaw: cell, parsed });
    }

    if (starts.length === 0) continue;
    starts.sort((a, b) => a.col - b.col);

    const headerRow = matrix[rowIdx + 1] || [];

    for (let sIdx = 0; sIdx < starts.length; sIdx++) {
      const blockStart = starts[sIdx].col;
      const blockEnd = starts[sIdx + 1]?.col ?? Math.max(row.length, headerRow.length);

      // The *next* row after the date must contain the required headers
      const stagesCol = findLabelInRange(headerRow, blockStart, blockEnd, ['stages', 'stage']);
      const usernamesCol = findLabelInRange(headerRow, blockStart, blockEnd, [
        'usernames',
        'username',
        'user_name',
        'user name',
        // Some sheets label this column as PRODUCT
        'product',
        'id',
      ]);
      const totalCol = findLabelInRange(headerRow, blockStart, blockEnd, ['total']);

      // If we can't find these, this is not a real date block.
      if (usernamesCol < 0 || totalCol < 0) continue;

      // Scan the data rows under the header for this block
      let currentStage = '';

      for (let r = rowIdx + 2; r < matrix.length; r++) {
        const dataRow = matrix[r] || [];
        const stageCell = String(dataRow[stagesCol] ?? '').trim();
        const userCell = String(dataRow[usernamesCol] ?? '').trim();

        // Stage divider rows (blue rows in the sheet) usually have stage but no username
        if (stageCell && !userCell && looksLikeStage(stageCell)) {
          currentStage = stageCell
            .toUpperCase()
            .replace(/^.*\bT\s*-?\s*(\d+)\b.*$/, 'T-$1')
            .replace(/^.*\bS\s*-?\s*(\d+)\b.*$/, 'S$1');
          continue;
        }

        if (normalizeWorkerIdComparable(userCell) === normalizedWorkerId) {
          foundUserName = userCell || originalWorkerId;
          const resolvedStage = stageCell
            ? stageCell
                .toUpperCase()
                .replace(/^.*\bT\s*-?\s*(\d+)\b.*$/, 'T-$1')
                .replace(/^.*\bS\s*-?\s*(\d+)\b.*$/, 'S$1')
            : currentStage;
          if (resolvedStage) foundStage = resolvedStage;

          dailyData.push({
            date: starts[sIdx].parsed.formatted,
            dayNumber: starts[sIdx].parsed.day,
            fullDate: starts[sIdx].parsed.timestamp,
            value: parseNumberLike(dataRow[totalCol]),
          });
          break; // found worker for this date block
        }
      }
    }
  }

  if (dailyData.length > 0) {
    const sorted = dailyData.sort((a, b) => (a.fullDate ?? 0) - (b.fullDate ?? 0));
    return {
      workerId: originalWorkerId,
      userName: foundUserName || originalWorkerId,
      stage: foundStage || 'N/A',
      bucket: 'N/A',
      dailyData: sorted,
      valueType: 'amount',
    };
  }

  // --------------------------------------------------------------------------
  // PASS 2 (fallback): older format where dates are in `data.headers`
  // --------------------------------------------------------------------------
  const headers = data.headers;
  const labelRow = data.rows[0] || [];

  const dateBlocks: Array<{ start: number; date: string; parsedDate: { day: number; formatted: string; timestamp: number } | null }> = [];

  for (let i = 0; i < headers.length; i++) {
    const header = String(headers[i] ?? '').trim();

    if (header.toUpperCase().includes('COLLECTOR BONUS') || header.toUpperCase().includes('GH_COLLECTOR')) {
      continue;
    }

    const parsed = parseDateFromHeader(header, data.sheetName);
    if (parsed) {
      dateBlocks.push({ start: i, date: header, parsedDate: parsed });
    }
  }

  if (dateBlocks.length === 0) return null;

  const fallbackDailyData: DailyBonus[] = [];
  let fallbackStage = '';
  let fallbackUserName = '';

  for (let blockIdx = 0; blockIdx < dateBlocks.length; blockIdx++) {
    const block = dateBlocks[blockIdx];
    const blockStart = block.start;
    const blockEnd = dateBlocks[blockIdx + 1]?.start ?? headers.length;

    const stagesCol = findLabelInRange(labelRow, blockStart, blockEnd, ['stages', 'stage']);
    const usernamesCol = findLabelInRange(labelRow, blockStart, blockEnd, ['usernames', 'username', 'names', 'name', 'user id', 'product']);
    const totalCol = findLabelInRange(labelRow, blockStart, blockEnd, ['total']);

    if (usernamesCol < 0) continue;

    for (let rowIdx = 1; rowIdx < data.rows.length; rowIdx++) {
      const row = data.rows[rowIdx];
      const cellValue = normalizeWorkerIdComparable(row[usernamesCol]);

      if (cellValue === normalizedWorkerId) {
        fallbackUserName = row[usernamesCol] || originalWorkerId;

        if (stagesCol >= 0 && row[stagesCol] && row[stagesCol].trim()) {
          fallbackStage = row[stagesCol]
            .trim()
            .toUpperCase()
            .replace(/^.*\bT\s*-?\s*(\d+)\b.*$/, 'T-$1')
            .replace(/^.*\bS\s*-?\s*(\d+)\b.*$/, 'S$1');
        }

        let bonusValue = 0;
        if (totalCol >= 0 && row[totalCol]) {
          bonusValue = parseNumberLike(row[totalCol]);
        }

        fallbackDailyData.push({
          date: block.parsedDate?.formatted || block.date,
          dayNumber: block.parsedDate?.day,
          fullDate: block.parsedDate?.timestamp,
          value: bonusValue,
        });

        break;
      }
    }
  }

  if (fallbackDailyData.length === 0) return null;

  const sortedFallback = fallbackDailyData.sort((a, b) => (a.fullDate ?? 0) - (b.fullDate ?? 0));
  return {
    workerId: originalWorkerId,
    userName: fallbackUserName || originalWorkerId,
    stage: fallbackStage || 'N/A',
    bucket: 'N/A',
    dailyData: sortedFallback,
    valueType: 'amount',
  };
}

// Find label index within a specific column range
function findLabelInRange(labelRow: string[], start: number, end: number, needles: string[]): number {
  for (let i = start; i < end && i < labelRow.length; i++) {
    const cell = normalizeLabel(labelRow[i]);
    if (!cell) continue;
    if (needles.some((n) => cell === n || cell.includes(n))) return i;
  }
  return -1;
}

// Parse date from header like "1/1/2026", "12/28/2025", "1ST JAN 2026"
function parseDateFromHeader(header: string, sheetName: string): { day: number; formatted: string; timestamp: number } | null {
  const trimmed = header.trim();
  if (!trimmed) return null;
  
  // Try MM/DD/YYYY or M/D/YYYY format
  const slashMatch = trimmed.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    const month = parseInt(slashMatch[1], 10);
    const day = parseInt(slashMatch[2], 10);
    const year = parseInt(slashMatch[3], 10);
    const date = new Date(year, month - 1, day);
    return {
      day,
      formatted: formatDateWithDay(date),
      timestamp: date.getTime(),
    };
  }
  
  // Try "1ST JAN 2026" format
  const ordinalMatch = trimmed.match(/(\d{1,2})(st|nd|rd|th)?\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s*(\d{4})?/i);
  if (ordinalMatch) {
    const day = parseInt(ordinalMatch[1], 10);
    const monthStr = ordinalMatch[3].toLowerCase();
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const month = months.indexOf(monthStr);
    const year = ordinalMatch[4] ? parseInt(ordinalMatch[4], 10) : new Date().getFullYear();
    const date = new Date(year, month, day);
    return {
      day,
      formatted: formatDateWithDay(date),
      timestamp: date.getTime(),
    };
  }
  
  return null;
}

// Format date like "Jan 16, Thu"
function formatDateWithDay(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${days[date.getDay()]}`;
}

// ============================================================================
// PARSER: RANKING BONUS style sheets
// Structure: Headers contain dates (e.g., "1ST JAN 2026"), row 0 has field labels repeating per block
// Block columns: IDs(Stage), Names, Recovery rate, Rank, Rate, Ranking Bonus
// ============================================================================
function parseRankingBonusSheet(
  data: SheetData,
  normalizedWorkerId: string,
  originalWorkerId: string
): WorkerData | null {
  const headers = data.headers;
  const labelRow = data.rows[0] || [];
  
  // Find date blocks in headers
  const blocks = extractDateBlocks(headers);
  console.log('[RANKING DEBUG] Blocks found:', blocks.map(b => ({ date: b.date, start: b.start, end: b.end })));
  if (blocks.length === 0) return null;

  const dailyData: DailyBonus[] = [];
  let foundStage = '';
  let foundUserName = '';

  for (const block of blocks) {
    // For the last block, ensure end doesn't exceed labelRow length
    const effectiveEnd = Math.min(block.end, labelRow.length);
    
    // Find NAMES/USERNAMES column within this block (where worker IDs are listed)
    const usernameCol = findLabelIndex(labelRow, block.start, effectiveEnd, ['names', 'usernames', 'username', 'user id', 'user_id', 'id', 'name']);
    // Find STAGES/IDS column (like S1, S2, T-1)
    const stageCol = findLabelIndex(labelRow, block.start, effectiveEnd, ['stage', 'stages', 'ids']);
    // Find "Ranking Bonus" column - this is the value we need
    const rankingBonusCol = findLabelIndex(labelRow, block.start, effectiveEnd, ['ranking bonus']);

    // If we couldn't find required columns in the expected range, try a wider search from block.start
    const finalUsernameCol = usernameCol >= 0 ? usernameCol : findLabelIndex(labelRow, block.start, labelRow.length, ['names', 'usernames', 'username', 'user id', 'user_id', 'id', 'name']);
    const finalRankingBonusCol = rankingBonusCol >= 0 ? rankingBonusCol : findLabelIndex(labelRow, block.start, labelRow.length, ['ranking bonus']);

    if (finalUsernameCol < 0 || finalRankingBonusCol < 0) continue;

    // Search all data rows for this worker in this block
    for (const row of data.rows.slice(1)) {
      if (normalizeWorkerIdComparable(row[finalUsernameCol]) === normalizedWorkerId) {
        foundUserName = row[finalUsernameCol] || originalWorkerId;
        if (stageCol >= 0 && row[stageCol] && row[stageCol].trim()) {
          foundStage = row[stageCol]
            .trim()
            .toUpperCase()
            .replace(/^.*\bT\s*-?\s*(\d+)\b.*$/, 'T-$1')
            .replace(/^.*\bS\s*-?\s*(\d+)\b.*$/, 'S$1');
        }
        
        const value = parseNumberLike(row[finalRankingBonusCol]);
        const parsedDate = parseDateFromHeader(block.date, data.sheetName);
        
        dailyData.push({ 
          date: parsedDate?.formatted || block.date, 
          dayNumber: parsedDate?.day ?? extractDayFromDateString(block.date) ?? undefined,
          fullDate: parsedDate?.timestamp,
          value 
        });
        break;
      }
    }
  }

  if (dailyData.length > 0) {
    return {
      workerId: originalWorkerId,
      userName: foundUserName,
      stage: foundStage || 'N/A',
      bucket: 'N/A',
      dailyData,
      valueType: 'amount',
    };
  }

  return null;
}

// ============================================================================
// PARSER: WEEKLY BONUS style sheets
// ============================================================================
function parseWeeklyBonusSheet(
  data: SheetData,
  normalizedWorkerId: string,
  originalWorkerId: string
): WorkerData | null {
  if (data.rows.length < 3) return null;

  const labelRow = data.rows[1]; // Row with "bucket", "user_name", dates
  if (!labelRow) return null;

  const weekBlocks: Array<{ userNameCol: number; dateColumns: Array<{ col: number; date: string; parsed: { day: number; formatted: string; timestamp: number } | null }> }> = [];

  for (let i = 0; i < labelRow.length; i++) {
    const label = normalizeLabel(labelRow[i]);
    if (label === 'user_name' || label === 'username' || label === 'name') {
      const dateColumns: Array<{ col: number; date: string; parsed: { day: number; formatted: string; timestamp: number } | null }> = [];
      for (let j = i + 1; j < labelRow.length; j++) {
        const nextLabel = normalizeLabel(labelRow[j]);
        if (nextLabel === 'user_name' || nextLabel === 'username' || nextLabel === 'name' || nextLabel === 'bucket') {
          break;
        }
        if (isDateLike(labelRow[j])) {
          const parsed = parseDateFromHeader(labelRow[j], data.sheetName);
          dateColumns.push({ col: j, date: labelRow[j], parsed });
        }
      }
      if (dateColumns.length > 0) {
        weekBlocks.push({ userNameCol: i, dateColumns });
      }
    }
  }

  if (weekBlocks.length === 0) return null;

  const dailyData: DailyBonus[] = [];
  let foundUserName = '';

  for (const block of weekBlocks) {
    for (const row of data.rows.slice(2)) {
      if (normalizeWorkerIdComparable(row[block.userNameCol]) === normalizedWorkerId) {
        foundUserName = row[block.userNameCol] || originalWorkerId;
        for (const { col, date, parsed } of block.dateColumns) {
          const value = parseNumberLike(row[col]);
          dailyData.push({ 
            date: parsed?.formatted || date, 
            dayNumber: parsed?.day,
            fullDate: parsed?.timestamp,
            value 
          });
        }
        break;
      }
    }
  }

  if (dailyData.length > 0) {
    const valueType: BonusValueType = dailyData.every(d => d.value <= 100) ? 'percent' : 'amount';
    
    return {
      workerId: originalWorkerId,
      userName: foundUserName,
      stage: 'N/A',
      bucket: 'N/A',
      dailyData,
      valueType,
    };
  }

  return null;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function normalizeComparable(value: unknown): string {
  return String(value ?? '').trim().toUpperCase();
}

function normalizeLabel(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

// Canonical collector ID normalization.
// - Handles "GHAS1001", "GHAS-1001", "GHAS 1001" as the same collector.
// - We intentionally keep leading zeros in the numeric portion (e.g., 0001).
const WORKER_ID_PATTERN = /^([A-Z]{2,6})\s*[-\s]?\s*(\d{3,6})$/i;

function normalizeWorkerIdComparable(value: unknown): string {
  const raw = normalizeComparable(value);
  const match = raw.match(WORKER_ID_PATTERN);
  if (match) return `${match[1]}${match[2]}`;
  return raw.replace(/[^A-Z0-9]/g, '');
}

function normalizeWorkerIdForDisplay(value: unknown): string | null {
  const raw = normalizeComparable(value);
  const match = raw.match(WORKER_ID_PATTERN);
  if (!match) return null;
  return `${match[1]}${match[2]}`;
}

function parseNumberLike(value: unknown): number {
  const raw = String(value ?? '').trim();
  if (!raw) return 0;
  const cleaned = raw.replace(/,/g, '').replace(/%/g, '').replace(/[^0-9.\-]/g, '');
  const num = Number.parseFloat(cleaned);
  return Number.isFinite(num) ? num : 0;
}

function isDateLike(value: unknown): boolean {
  const s = String(value ?? '').trim();
  if (!s) return false;
  // Match various date formats
  return /\b\d{1,2}[\/\-]\d{1,2}([\/\-]\d{2,4})?\b/.test(s) 
    || /\b\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}\b/.test(s)
    || /\d{1,2}(st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(s);
}

function extractDateBlocks(headers: string[]): Array<{ start: number; end: number; date: string }> {
  const starts: number[] = [];
  headers.forEach((h, i) => {
    // Look for date-like patterns in headers
    if (/\d{1,2}(st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(h) || isDateLike(h)) {
      starts.push(i);
    }
  });

  return starts.map((start, idx) => ({
    start,
    end: starts[idx + 1] ?? headers.length,
    date: String(headers[start] ?? '').trim(),
  }));
}

function findLabelIndex(labelRow: string[], start: number, end: number, needles: string[]): number {
  for (let i = start; i < end; i++) {
    const cell = normalizeLabel(labelRow[i]);
    if (!cell) continue;
    if (needles.some((n) => cell === n || cell.includes(n))) return i;
  }
  return -1;
}

function findBlockWidth(labelRow: string[], blockStart: number): number {
  // Find width by looking for empty cells or repeated STAGE label
  for (let i = blockStart + 1; i < labelRow.length; i++) {
    const label = normalizeLabel(labelRow[i]);
    if (label === 'stage' || label === 'stages') {
      return i - blockStart;
    }
  }
  // Default block width
  return 9;
}

function extractMonthFromSheetName(sheetName: string): string | null {
  const monthMatch = sheetName.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i);
  if (monthMatch) {
    const month = monthMatch[1].toLowerCase();
    return month.charAt(0).toUpperCase() + month.slice(1);
  }
  return null;
}

function extractDayFromDateString(dateStr: string): number | null {
  // Try to extract day number from strings like "1ST JAN 2026", "Jan 15", etc.
  const match = dateStr.match(/(\d{1,2})(st|nd|rd|th)?/i);
  if (match) {
    const day = parseInt(match[1], 10);
    if (day >= 1 && day <= 31) return day;
  }
  return null;
}

function formatDateForDisplay(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}
