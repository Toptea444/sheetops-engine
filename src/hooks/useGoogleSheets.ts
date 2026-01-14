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

  const calculateBonus = useCallback((worker: WorkerData, startDate: Date, endDate: Date): BonusResult => {
    // Generate all dates in range
    const allDatesInRange: Date[] = [];
    const current = new Date(startDate);
    while (current <= endDate) {
      allDatesInRange.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    // Create a map of day number to bonus value from worker data
    const bonusMap = new Map<number, { date: string; value: number }>();
    for (const d of worker.dailyData) {
      if (d.dayNumber !== undefined) {
        bonusMap.set(d.dayNumber, { date: d.date, value: d.value });
      }
    }

    // Build daily breakdown with all dates (0 for missing)
    const dailyBreakdown: DailyBonus[] = allDatesInRange.map(date => {
      const dayNum = date.getDate();
      const existing = bonusMap.get(dayNum);
      const formattedDate = formatDateForDisplay(date);
      
      return {
        date: existing?.date || formattedDate,
        dayNumber: dayNum,
        value: existing?.value ?? 0,
      };
    });

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
      valueType: worker.valueType ?? 'amount',
    };
  }, []);

  return {
    isLoading,
    error,
    sheets,
    sheetData,
    fetchSheets,
    fetchSheetData,
    searchWorker,
    calculateBonus,
  };
}

// ============================================================================
// PARSER: DAILY & PERFORMANCE style sheets
// Structure: Each row contains multiple blocks horizontally
// Block format: [STAGE, WorkerID, Rate%, RecoveryBonus, DayNum, RankRate%, RankingBonus, WeeklyBonus/Total, "", ...]
// ============================================================================
function parseDailyPerformanceSheet(
  data: SheetData,
  normalizedWorkerId: string,
  originalWorkerId: string
): WorkerData | null {
  const labelRow = data.rows[0] || [];
  
  // Find all "STAGE" positions in the label row - these mark block starts
  const blockStarts: number[] = [];
  for (let i = 0; i < labelRow.length; i++) {
    const label = normalizeLabel(labelRow[i]);
    if (label === 'stage' || label === 'stages') {
      blockStarts.push(i);
    }
  }

  if (blockStarts.length === 0) return null;

  // Determine block width by finding pattern
  const blockWidth = blockStarts.length > 1 
    ? blockStarts[1] - blockStarts[0] 
    : findBlockWidth(labelRow, blockStarts[0]);

  const dailyData: DailyBonus[] = [];
  let foundStage = '';
  let foundUserName = '';

  // Search all data rows (skip header rows)
  for (let rowIdx = 1; rowIdx < data.rows.length; rowIdx++) {
    const row = data.rows[rowIdx];
    
    // Check each block in this row
    for (let blockIdx = 0; blockIdx < blockStarts.length; blockIdx++) {
      const blockStart = blockStarts[blockIdx];
      const blockEnd = blockStarts[blockIdx + 1] ?? (blockStart + blockWidth);
      
      // Find Worker ID column (column index 1 within block - "PRODUCT" column)
      const workerIdCol = blockStart + 1;
      
      // Check if this block contains our worker
      if (normalizeComparable(row[workerIdCol]) === normalizedWorkerId) {
        foundUserName = row[workerIdCol] || originalWorkerId;
        foundStage = row[blockStart] || foundStage || 'N/A'; // STAGE column
        
        // Find the day number - look for a number between 1-31 in the block
        let dayNumber: number | null = null;
        let totalValue = 0;
        
        // Parse block columns based on structure:
        // [STAGE(0), WorkerID(1), Rate%(2), RecoveryBonus(3), DayNum(4), RankRate%(5), RankingBonus(6), WeeklyBonus/Total(7)]
        for (let col = blockStart + 2; col < blockEnd && col < row.length; col++) {
          const cellValue = row[col]?.trim() || '';
          const labelValue = normalizeLabel(labelRow[col] || '');
          
          // Look for day number (pure number 1-31)
          if (/^\d{1,2}$/.test(cellValue)) {
            const num = parseInt(cellValue, 10);
            if (num >= 1 && num <= 31) {
              dayNumber = num;
            }
          }
          
          // Look for Weekly bonus / Total column (the last meaningful value before empty separator)
          if (labelValue.includes('weekly') || labelValue === 'total' || labelValue.includes('weekly bonus')) {
            totalValue = parseNumberLike(cellValue);
          }
        }
        
        // If we didn't find labeled "weekly bonus", get the last non-empty numeric value in block
        if (totalValue === 0) {
          for (let col = Math.min(blockEnd - 1, row.length - 1); col > blockStart + 2; col--) {
            const cellValue = row[col]?.trim() || '';
            if (cellValue && !cellValue.includes('%')) {
              const parsed = parseNumberLike(cellValue);
              if (parsed > 0) {
                totalValue = parsed;
                break;
              }
            }
          }
        }

        if (dayNumber !== null && totalValue > 0) {
          // Format date as "Jan X" based on sheet name context
          const monthName = extractMonthFromSheetName(data.sheetName) || 'Jan';
          const dateStr = `${monthName} ${dayNumber}`;
          
          dailyData.push({
            date: dateStr,
            dayNumber,
            value: totalValue,
          });
        }
      }
    }
  }

  if (dailyData.length > 0) {
    // Sort by day number and remove duplicates (keep highest value per day)
    const dayMap = new Map<number, DailyBonus>();
    for (const d of dailyData) {
      if (d.dayNumber !== undefined) {
        const existing = dayMap.get(d.dayNumber);
        if (!existing || d.value > existing.value) {
          dayMap.set(d.dayNumber, d);
        }
      }
    }
    
    const sortedData = Array.from(dayMap.values()).sort((a, b) => 
      (a.dayNumber ?? 0) - (b.dayNumber ?? 0)
    );

    return {
      workerId: originalWorkerId,
      userName: foundUserName,
      stage: foundStage,
      bucket: 'N/A',
      dailyData: sortedData,
      valueType: 'amount',
    };
  }

  return null;
}

// ============================================================================
// PARSER: RANKING BONUS style sheets
// Structure: Headers contain dates (e.g., "1ST JAN 2026"), row 0 has field labels repeating per block
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
  if (blocks.length === 0) return null;

  const dailyData: DailyBonus[] = [];
  let foundStage = '';
  let foundUserName = '';

  for (const block of blocks) {
    // Find USERNAMES column within this block
    const usernameCol = findLabelIndex(labelRow, block.start, block.end, ['usernames', 'username', 'user id', 'user_id', 'id', 'name']);
    // Find STAGES column
    const stageCol = findLabelIndex(labelRow, block.start, block.end, ['stage', 'stages']);
    // Find value column: prioritize "ranking bonus"
    const rankingBonusCol = findLabelIndex(labelRow, block.start, block.end, ['ranking bonus']);

    if (usernameCol < 0 || rankingBonusCol < 0) continue;

    // Search all data rows for this worker in this block
    for (const row of data.rows.slice(1)) {
      if (normalizeComparable(row[usernameCol]) === normalizedWorkerId) {
        foundUserName = row[usernameCol] || originalWorkerId;
        if (stageCol >= 0 && row[stageCol]) {
          foundStage = row[stageCol];
        }
        
        const value = parseNumberLike(row[rankingBonusCol]);
        const dayNumber = extractDayFromDateString(block.date);
        
        dailyData.push({ 
          date: block.date, 
          dayNumber: dayNumber ?? undefined,
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

  const weekBlocks: Array<{ userNameCol: number; dateColumns: Array<{ col: number; date: string }> }> = [];

  for (let i = 0; i < labelRow.length; i++) {
    const label = normalizeLabel(labelRow[i]);
    if (label === 'user_name' || label === 'username' || label === 'name') {
      const dateColumns: Array<{ col: number; date: string }> = [];
      for (let j = i + 1; j < labelRow.length; j++) {
        const nextLabel = normalizeLabel(labelRow[j]);
        if (nextLabel === 'user_name' || nextLabel === 'username' || nextLabel === 'name' || nextLabel === 'bucket') {
          break;
        }
        if (isDateLike(labelRow[j])) {
          dateColumns.push({ col: j, date: labelRow[j] });
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
        for (const { col, date } of block.dateColumns) {
          const value = parseNumberLike(row[col]);
          dailyData.push({ date, value });
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
