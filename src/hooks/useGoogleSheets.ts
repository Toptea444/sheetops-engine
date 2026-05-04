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

const SPREADSHEET_ID = '18Vjztt0odhAMzZiqIv4_HgIl5ebrzh4p67NFMWOQyQg';

/** Extract a user-friendly message from edge function errors */
function extractUserFriendlyError(err: unknown, fallback: string): string {
  if (err instanceof Error) {
    const msg = err.message;
    // Already a friendly message from our edge function
    if (msg.includes('Access denied') || msg.includes('not publicly accessible')) return msg;
    if (msg.includes('could not be found')) return msg;
    if (msg.includes('rate-limited') || msg.includes('Too many requests')) return msg;
    if (msg.includes('temporarily unavailable')) return msg;
    // Generic edge function wrapper error — try to extract the JSON body
    const jsonMatch = msg.match(/"error"\s*:\s*"([^"]+)"/);
    if (jsonMatch?.[1]) return jsonMatch[1];
    // "Edge function returned 403" style
    if (msg.includes('403')) return 'Access denied — the spreadsheet is not publicly accessible right now. The sheet owner may have restricted permissions or is updating data. Please try again later.';
    if (msg.includes('404')) return 'The spreadsheet or sheet could not be found. It may have been moved or deleted.';
    return msg;
  }
  return fallback;
}

/** Try to extract the friendly error from a FunctionsHttpError or invoke result */
async function extractEdgeFunctionError(fnError: unknown): Promise<string | null> {
  if (!fnError) return null;
  // supabase-js FunctionsHttpError has a `context` property (the Response)
  const ctx = (fnError as any)?.context;
  if (ctx && typeof ctx.json === 'function') {
    try {
      const body = await ctx.json();
      if (body?.error && typeof body.error === 'string') return body.error;
    } catch {
      // response body already consumed or not JSON
    }
  }
  // Fallback: the error message itself may contain the JSON body
  if (fnError instanceof Error) {
    const match = fnError.message.match(/"error"\s*:\s*"([^"]+)"/);
    if (match?.[1]) return match[1];
  }
  return null;
}

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

      if (fnError) {
        const friendly = await extractEdgeFunctionError(fnError);
        throw new Error(friendly || extractUserFriendlyError(fnError, 'Failed to fetch sheets'));
      }
      if (data?.error) throw new Error(data.error);

      const list: SheetInfo[] = data?.sheets || [];
      setSheets(list);
      return list;
    } catch (err) {
      const message = extractUserFriendlyError(err, 'Failed to fetch sheets');
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

      if (fnError) {
        const friendly = await extractEdgeFunctionError(fnError);
        throw new Error(friendly || extractUserFriendlyError(fnError, 'Failed to fetch sheet data'));
      }
      if (data?.error) throw new Error(data.error);

      const result: SheetData = {
        headers: (data?.headers || []).map((h: unknown) => String(h ?? '')),
        rows: (data?.rows || []).map((row: unknown[]) => row.map((c) => String(c ?? ''))),
        sheetName,
      };

      setSheetData(result);
      return result;
    } catch (err) {
      const message = extractUserFriendlyError(err, 'Failed to fetch sheet data');
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const searchWorker = useCallback((data: SheetData, workerId: string): WorkerData | null => {
    if (!data || data.rows.length === 0) return null;

    const sheetName = data.sheetName.toUpperCase();
    const normalizedWorkerId = normalizeComparable(workerId);

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
            bonus: d.bonus,
            rankingBonus: d.rankingBonus,
            total: d.total,
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

  const clearError = useCallback(() => setError(null), []);

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
    clearError,
  };
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
  const processedDates = new Set<string>();
  let foundStage = '';
  let foundUserName = '';

  const looksLikeStage = (value: string) => {
    const v = value.trim().toUpperCase();
    return (
      /^T-?\d+$/.test(v) ||
      /^S-?\d+$/.test(v) ||
      /^STAGE\s*-?\s*\d+$/.test(v)
    );
  };

  // Build a full matrix including the first header row from the API
  const matrix: string[][] = [data.headers, ...data.rows];
  const inferColumnsFromRows = (blockStart: number, blockEnd: number, dataStartRow: number) => {
    const effectiveEnd = Math.min(blockEnd, Math.max(blockStart + 1, matrix[dataStartRow]?.length ?? blockEnd));

    // Typical layout fallback:
    // STAGES | USERNAMES | RECOVERY RATE | BONUS | RANK | RATE | RANKING BONUS | TOTAL
    const fallback = {
      stagesCol: blockStart,
      usernamesCol: blockStart + 1,
      bonusCol: blockStart + 3,
      rankingBonusCol: blockStart + 6,
      totalCol: blockStart + 7,
    };

    // Keep fallback indices inside the current block
    const boundedFallback = {
      stagesCol: fallback.stagesCol < effectiveEnd ? fallback.stagesCol : -1,
      usernamesCol: fallback.usernamesCol < effectiveEnd ? fallback.usernamesCol : -1,
      bonusCol: fallback.bonusCol < effectiveEnd ? fallback.bonusCol : -1,
      rankingBonusCol: fallback.rankingBonusCol < effectiveEnd ? fallback.rankingBonusCol : -1,
      totalCol: fallback.totalCol < effectiveEnd ? fallback.totalCol : -1,
    };

    const looksLikeUserId = (v: string) => {
      const t = v.trim().toUpperCase();
      if (!t) return false;
      // Examples: NGDS1009 (S1), NGDS0001 (T0), NGDS-1009 (T-1), K-1001
      return /^[A-Z]{1,6}(?:-)?\d{2,6}$/.test(t);
    };

    const sampleRows = matrix.slice(dataStartRow, Math.min(matrix.length, dataStartRow + 80));
    // Prefer columns that look like user IDs
    let inferredUsernamesCol = -1;
    let userBest = -1;
    for (let c = blockStart; c < effectiveEnd; c++) {
      let userLike = 0;
      for (const row of sampleRows) {
        if (looksLikeUserId(String(row?.[c] ?? ''))) userLike++;
      }
      if (userLike > userBest) {
        userBest = userLike;
        inferredUsernamesCol = c;
      }
    }

    // If we couldn't infer from data, use structural fallback
    if (userBest <= 0) inferredUsernamesCol = boundedFallback.usernamesCol;

    const inferredStagesCol =
      inferredUsernamesCol > blockStart ? inferredUsernamesCol - 1 : boundedFallback.stagesCol;
    const inferredBonusCol =
      inferredUsernamesCol + 2 < effectiveEnd ? inferredUsernamesCol + 2 : boundedFallback.bonusCol;
    const inferredRankingBonusCol =
      inferredUsernamesCol + 5 < effectiveEnd
        ? inferredUsernamesCol + 5
        : (boundedFallback.rankingBonusCol >= 0 ? boundedFallback.rankingBonusCol : -1);
    const inferredTotalCol =
      inferredUsernamesCol + 6 < effectiveEnd
        ? inferredUsernamesCol + 6
        : (boundedFallback.totalCol >= 0 ? boundedFallback.totalCol : -1);

    return {
      stagesCol: inferredStagesCol,
      usernamesCol: inferredUsernamesCol,
      bonusCol: inferredBonusCol,
      rankingBonusCol: inferredRankingBonusCol,
      totalCol: inferredTotalCol,
    };
  };

  // --------------------------------------------------------------------------
  // PASS 1 (preferred): Find date blocks in ROWS (date row + header row)
  // --------------------------------------------------------------------------
  // Helper function to find a date for a block, with fallback to scanning upward
  const getBlockDate = (blockCol: number, primaryRowIdx: number, matrix: string[][]): { day: number; formatted: string; timestamp: number } | null => {
    // First try to get the date from the primary location (same row where we found other dates)
    const primaryCell = String(matrix[primaryRowIdx]?.[blockCol] ?? '').trim();
    if (primaryCell && !primaryCell.toUpperCase().includes('COLLECTOR BONUS')) {
      const parsed = parseDateFromHeader(primaryCell, data.sheetName);
      if (parsed) return parsed;
    }

    // Fallback: scan upward in the same column to find the date at the top (usually row 0 or higher)
    for (let scanRow = primaryRowIdx - 1; scanRow >= 0; scanRow--) {
      const cell = String(matrix[scanRow]?.[blockCol] ?? '').trim();
      if (!cell) continue;
      if (cell.toUpperCase().includes('COLLECTOR BONUS')) continue;

      const parsed = parseDateFromHeader(cell, data.sheetName);
      if (parsed) return parsed;
    }

    return null;
  };

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

    // Compute the widest data row width within the block scan area. The Google
    // Sheets API trims trailing empty cells per row, so the date row and header
    // row can be shorter than the actual data rows below. Without this, the
    // LAST date block ends prematurely and gets skipped (e.g. April 15th column
    // is at col 126 but date/header rows are truncated, while data rows extend
    // to col 134).
    let widestDataRow = Math.max(row.length, headerRow.length);
    for (let r = rowIdx + 2; r < Math.min(matrix.length, rowIdx + 80); r++) {
      const len = matrix[r]?.length ?? 0;
      if (len > widestDataRow) widestDataRow = len;
    }

    for (let sIdx = 0; sIdx < starts.length; sIdx++) {
      const blockStart = starts[sIdx].col;
      const blockEnd = starts[sIdx + 1]?.col ?? widestDataRow;

      // Get the date for this block using primary location + fallback to scanning upward
      const blockDate = getBlockDate(blockStart, rowIdx, matrix);
      if (!blockDate) continue; // Skip if we can't find a date for this block

      // The *next* row after the date must contain the required headers
      let stagesCol = findLabelInRange(headerRow, blockStart, blockEnd, ['stages', 'stage']);
      let usernamesCol = findLabelInRange(headerRow, blockStart, blockEnd, [
        'usernames',
        'username',
        'user_name',
        'user name',
        // Some sheets label this column as PRODUCT
        'product',
        'id',
      ]);
      let totalCol = findLabelInRange(headerRow, blockStart, blockEnd, ['total']);

      // Daily & Performance breakdown
      let bonusCol = findLabelInRangeExact(headerRow, blockStart, blockEnd, ['bonus', 'daily bonus']);
      let rankingBonusCol = findLabelInRangeExact(headerRow, blockStart, blockEnd, [
        'ranking bonus',
        'rank bonus',
      ]);

      // Fallback for malformed sheets where header names are blank/missing.
      if (usernamesCol < 0 || totalCol < 0) {
        const inferred = inferColumnsFromRows(blockStart, blockEnd, rowIdx + 2);
        if (usernamesCol < 0) usernamesCol = inferred.usernamesCol;
        if (stagesCol < 0) stagesCol = inferred.stagesCol;
        if (bonusCol < 0) bonusCol = inferred.bonusCol;
        if (rankingBonusCol < 0) rankingBonusCol = inferred.rankingBonusCol;
        if (totalCol < 0) totalCol = inferred.totalCol;
      }

      // If still missing critical columns, skip this block.
      if (usernamesCol < 0 || totalCol < 0) continue;

      // Scan the data rows under the header for this block
      let currentStage = '';

      for (let r = rowIdx + 2; r < matrix.length; r++) {
        const dataRow = matrix[r] || [];
        const stageCell = String(dataRow[stagesCol] ?? '').trim();
        const userCell = String(dataRow[usernamesCol] ?? '').trim();

        // Stage divider rows (blue rows in the sheet) usually have stage but no username
        if (stageCell && !userCell && looksLikeStage(stageCell)) {
          currentStage = stageCell;
          continue;
        }

        if (normalizeComparable(userCell) === normalizedWorkerId) {
          foundUserName = userCell || originalWorkerId;
          const resolvedStage = stageCell || currentStage;
          if (resolvedStage) foundStage = resolvedStage;

          const dateKey = blockDate.timestamp
            ? String(blockDate.timestamp)
            : `${blockDate.formatted}-${blockStart}`;
          if (processedDates.has(dateKey)) {
            break;
          }

          const totalValue = parseNumberLike(dataRow[totalCol]);
          const bonusValue = bonusCol >= 0 ? parseNumberLike(dataRow[bonusCol]) : undefined;
          const rankingBonusValue =
            rankingBonusCol >= 0 ? parseNumberLike(dataRow[rankingBonusCol]) : undefined;

          // Calculate total as bonus + ranking bonus instead of using sheet total
          const calculatedValue = (bonusValue ?? 0) + (rankingBonusValue ?? 0);

          dailyData.push({
            date: blockDate.formatted,
            dayNumber: blockDate.day,
            fullDate: blockDate.timestamp,
            value: calculatedValue,
            total: calculatedValue,
            bonus: bonusValue,
            rankingBonus: rankingBonusValue,
          });
          processedDates.add(dateKey);
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
  const fallbackProcessedDates = new Set<string>();
  let fallbackStage = '';
  let fallbackUserName = '';

  for (let blockIdx = 0; blockIdx < dateBlocks.length; blockIdx++) {
    const block = dateBlocks[blockIdx];
    const blockStart = block.start;
    const blockEnd = dateBlocks[blockIdx + 1]?.start ?? headers.length;

    const stagesCol = findLabelInRange(labelRow, blockStart, blockEnd, ['stages', 'stage']);
    const usernamesCol = findLabelInRange(labelRow, blockStart, blockEnd, [
      'usernames',
      'username',
      'names',
      'name',
      'user id',
      'product',
    ]);
    const totalCol = findLabelInRange(labelRow, blockStart, blockEnd, ['total']);

    const bonusCol = findLabelInRangeExact(labelRow, blockStart, blockEnd, ['bonus', 'daily bonus']);
    const rankingBonusCol = findLabelInRangeExact(labelRow, blockStart, blockEnd, ['ranking bonus', 'rank bonus']);

    if (usernamesCol < 0) continue;

    for (let rowIdx = 1; rowIdx < data.rows.length; rowIdx++) {
      const row = data.rows[rowIdx];
      const cellValue = normalizeComparable(row[usernamesCol]);

      if (cellValue === normalizedWorkerId) {
        fallbackUserName = row[usernamesCol] || originalWorkerId;

        if (stagesCol >= 0 && row[stagesCol] && row[stagesCol].trim()) {
          fallbackStage = row[stagesCol].trim();
        }

        const totalValue = totalCol >= 0 ? parseNumberLike(row[totalCol]) : 0;
        const bonusValue = bonusCol >= 0 ? parseNumberLike(row[bonusCol]) : undefined;
        const rankingBonusValue = rankingBonusCol >= 0 ? parseNumberLike(row[rankingBonusCol]) : undefined;

        // Calculate total as bonus + ranking bonus instead of using sheet total
        const calculatedValue = (bonusValue ?? 0) + (rankingBonusValue ?? 0);
        const dateKey = block.parsedDate?.timestamp
          ? String(block.parsedDate.timestamp)
          : `${block.date}-${blockStart}`;
        if (fallbackProcessedDates.has(dateKey)) break;

        fallbackDailyData.push({
          date: block.parsedDate?.formatted || block.date,
          dayNumber: block.parsedDate?.day,
          fullDate: block.parsedDate?.timestamp,
          value: calculatedValue,
          total: calculatedValue,
          bonus: bonusValue,
          rankingBonus: rankingBonusValue,
        });
        fallbackProcessedDates.add(dateKey);

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

// Exact-match variant used to avoid collisions like "bonus" matching "ranking bonus"
function findLabelInRangeExact(labelRow: string[], start: number, end: number, needles: string[]): number {
  const normalizedNeedles = needles.map((n) => n.trim().toLowerCase());
  for (let i = start; i < end && i < labelRow.length; i++) {
    const cell = normalizeLabel(labelRow[i]);
    if (!cell) continue;
    if (normalizedNeedles.includes(cell)) return i;
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
// Block columns: STAGES, USERNAMES, RECOVERY RATE OF AMOUNT, RANK, RATE, RANKING BONUS
// Each block repeats for each date
// ============================================================================
function parseRankingBonusSheet(
  data: SheetData,
  normalizedWorkerId: string,
  originalWorkerId: string
): WorkerData | null {
  const headers = data.headers;
  const labelRow = data.rows[0] || [];
  
  // Find date blocks in headers, using labelRow.length as the true column count
  // (headers may be shorter than labelRow for the last block)
  const blocks = extractDateBlocks(headers, labelRow.length);
  if (blocks.length === 0) return null;

  const dailyData: DailyBonus[] = [];
  let foundStage = '';
  let foundUserName = '';
  
  // Track already processed dates to avoid duplicates
  const processedDates = new Set<string>();

  for (const block of blocks) {
    // Strictly use block boundaries - do NOT search beyond block.end
    const effectiveEnd = Math.min(block.end, labelRow.length);
    
    // Find columns ONLY within this specific block
    const usernameCol = findLabelIndex(labelRow, block.start, effectiveEnd, ['names', 'usernames', 'username', 'user id', 'user_id', 'name']);
    const stageCol = findLabelIndex(labelRow, block.start, effectiveEnd, ['stage', 'stages', 'ids']);
    const rankingBonusCol = findLabelIndex(labelRow, block.start, effectiveEnd, ['ranking bonus']);

    // If we can't find required columns in this block, skip it
    if (usernameCol < 0 || rankingBonusCol < 0) continue;

    // Search data rows for this worker in this block
    for (const row of data.rows.slice(1)) {
      const cellValue = row[usernameCol];
      if (!cellValue) continue;
      
      if (normalizeComparable(cellValue) === normalizedWorkerId) {
        foundUserName = cellValue || originalWorkerId;
        if (stageCol >= 0 && row[stageCol] && row[stageCol].trim()) {
          foundStage = row[stageCol].trim();
        }
        
        const value = parseNumberLike(row[rankingBonusCol]);
        const parsedDate = parseDateFromHeader(block.date, data.sheetName);
        const dateKey = parsedDate?.timestamp?.toString() || block.date;
        
        // Only add if we haven't processed this date already
        if (!processedDates.has(dateKey)) {
          processedDates.add(dateKey);
          dailyData.push({ 
            date: parsedDate?.formatted || block.date, 
            dayNumber: parsedDate?.day ?? extractDayFromDateString(block.date) ?? undefined,
            fullDate: parsedDate?.timestamp,
            value 
          });
        }
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
      if (normalizeComparable(row[block.userNameCol]) === normalizedWorkerId) {
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

function extractDateBlocks(headers: string[], totalColumns?: number): Array<{ start: number; end: number; date: string }> {
  const starts: number[] = [];
  headers.forEach((h, i) => {
    // Look for date-like patterns in headers
    if (/\d{1,2}(st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(h) || isDateLike(h)) {
      starts.push(i);
    }
  });

  // Use totalColumns if provided (for cases where labelRow is longer than headers)
  const maxEnd = totalColumns ?? headers.length;

  return starts.map((start, idx) => ({
    start,
    end: starts[idx + 1] ?? maxEnd,
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
