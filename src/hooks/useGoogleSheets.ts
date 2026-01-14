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

    const headers = data.headers;
    const normalizedWorkerId = normalizeComparable(workerId);

    // Strategy 1: Block layout for RANKING BONUS style sheets
    // Headers contain dates (e.g., "1ST JAN 2026"), row 0 has field labels repeating per block
    if (data.rows.length >= 1) {
      const labelRow = data.rows[0];
      const blocks = extractDateBlocks(headers);
      
      if (blocks.length > 0) {
        const dailyData: DailyBonus[] = [];
        let matchedId: string | null = null;

        for (const block of blocks) {
          // Find USERNAMES/username column within this block
          const usernameCol = findLabelIndex(labelRow, block.start, block.end, ['usernames', 'username', 'user id', 'user_id', 'id', 'name']);
          // Find value column: prioritize "ranking bonus", fallback to "total", then "bonus"
          const rankingBonusCol = findLabelIndex(labelRow, block.start, block.end, ['ranking bonus']);
          const totalCol = findLabelIndex(labelRow, block.start, block.end, ['total']);
          const bonusCol = rankingBonusCol >= 0 ? rankingBonusCol : (totalCol >= 0 ? totalCol : findLabelIndex(labelRow, block.start, block.end, ['bonus']));

          if (usernameCol < 0 || bonusCol < 0) continue;

          // Search all data rows for this worker in this block
          for (const row of data.rows.slice(1)) {
            if (normalizeComparable(row[usernameCol]) === normalizedWorkerId) {
              matchedId = matchedId ?? (row[usernameCol] || workerId);
              const value = parseNumberLike(row[bonusCol]);
              if (value > 0) {
                dailyData.push({ date: block.date, value });
              }
              break; // Found worker in this block
            }
          }
        }

        if (matchedId && dailyData.length > 0) {
          return {
            workerId,
            userName: matchedId,
            bucket: 'N/A',
            dailyData,
            valueType: 'amount', // Ranking bonus is always amount
          };
        }
      }
    }

    // Strategy 2: WEEKLY BONUS style - Headers are "WEEK 1", "WEEK 2", sub-rows have dates and user_name columns
    if (data.rows.length >= 3) {
      const result = searchWeeklyBlocks(data, headers, normalizedWorkerId, workerId);
      if (result) return result;
    }

    // Strategy 3: Horizontal repeating blocks (DAILY & PERFORMANCE style)
    // Each row has multiple day blocks side-by-side: [Stage, WorkerID, Rate, Bonus, Day#, %, Amount, Total, "", ...]
    // We detect this by looking for repeated patterns in the first data row
    if (data.rows.length >= 2) {
      const result = searchHorizontalBlocks(data, normalizedWorkerId, workerId);
      if (result) return result;
    }

    // Strategy 3: Standard tabular layout (ID column + date headers)
    const workerIdIndex = findHeaderIndex(headers, [
      'user_id',
      'worker',
      'id',
      'username',
      'usernames',
      'stage',
      'stages',
      'user_name',
      'name',
    ]);

    if (workerIdIndex >= 0) {
      const userNameIndex = findHeaderIndex(headers, ['user_name', 'name', 'username', 'usernames']);
      const bucketIndex = findHeaderIndex(headers, ['bucket']);

      const dateColumns: { index: number; date: string }[] = [];
      headers.forEach((header, index) => {
        if (isDateLike(header)) dateColumns.push({ index, date: header });
      });

      const workerRow = data.rows.find((row) => normalizeComparable(row[workerIdIndex]) === normalizedWorkerId);
      if (!workerRow) return null;

      const dailyData: DailyBonus[] = dateColumns.map(({ index, date }) => ({
        date,
        value: parseNumberLike(workerRow[index]),
      }));

      return {
        workerId: workerRow[workerIdIndex] || workerId,
        userName: (userNameIndex >= 0 ? workerRow[userNameIndex] : workerRow[workerIdIndex]) || workerId,
        bucket: bucketIndex >= 0 ? (workerRow[bucketIndex] || 'N/A') : 'N/A',
        dailyData,
        valueType: inferValueTypeFromCells(dailyData),
      };
    }

    // Strategy 4: Scan all rows for worker ID match in any column and extract "Total" value
    const dailyData: DailyBonus[] = [];
    let matchedUserName: string | null = null;

    for (let rowIdx = 0; rowIdx < data.rows.length; rowIdx++) {
      const row = data.rows[rowIdx];
      for (let colIdx = 0; colIdx < row.length; colIdx++) {
        if (normalizeComparable(row[colIdx]) === normalizedWorkerId) {
          matchedUserName = matchedUserName ?? row[colIdx];
          // Look for a "total" or numeric bonus value near this match
          // Check the labelRow (first data row) to find which columns are "Total" or "Weekly bonus"
          const labelRow = data.rows[0] || [];
          for (let searchCol = colIdx; searchCol < Math.min(colIdx + 10, row.length); searchCol++) {
            const label = normalizeLabel(labelRow[searchCol]);
            if (label.includes('total') || label.includes('weekly bonus')) {
              const value = parseNumberLike(row[searchCol]);
              if (value > 0) {
                // Try to determine date from nearby columns or row position
                const dayNum = findNearbyDayNumber(row, colIdx, searchCol);
                const dateStr = dayNum ? `Day ${dayNum}` : `Entry ${dailyData.length + 1}`;
                dailyData.push({ date: dateStr, value });
              }
              break;
            }
          }
        }
      }
    }

    if (matchedUserName && dailyData.length > 0) {
      return {
        workerId,
        userName: matchedUserName,
        bucket: 'N/A',
        dailyData,
        valueType: 'amount',
      };
    }

    return null;
  }, []);

  const calculateBonus = useCallback((worker: WorkerData, startDate: Date, endDate: Date): BonusResult => {
    const filteredData = worker.dailyData
      .map((d) => ({ ...d, parsed: parseDate(d.date) }))
      .filter((d) => d.parsed && d.parsed >= startDate && d.parsed <= endDate)
      .map(({ parsed: _parsed, ...rest }) => rest);

    const totalBonus = filteredData.reduce((sum, d) => sum + d.value, 0);

    return {
      workerId: worker.workerId,
      userName: worker.userName,
      bucket: worker.bucket,
      totalBonus,
      dailyBreakdown: filteredData,
      dateRange: {
        start: startDate.toLocaleDateString(),
        end: endDate.toLocaleDateString(),
      },
      valueType: worker.valueType ?? inferValueTypeFromCells(filteredData),
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

function normalizeComparable(value: unknown): string {
  // Preserve hyphens and other characters; only normalize whitespace + case.
  return String(value ?? '').trim().toUpperCase();
}

function normalizeLabel(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

function findHeaderIndex(headers: string[], needles: string[]): number {
  const normalized = headers.map((h) => normalizeLabel(h));
  return normalized.findIndex((h) => needles.some((n) => h === n || h.includes(n)));
}

function isDateLike(value: unknown): boolean {
  const s = String(value ?? '').trim();
  if (!s) return false;
  return /\b\d{1,2}[\/\-]\d{1,2}([\/\-]\d{2,4})?\b/.test(s) || /\b\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}\b/.test(s);
}

function extractDateBlocks(headers: string[]): Array<{ start: number; end: number; date: string }> {
  const starts: number[] = [];
  headers.forEach((h, i) => {
    if (isDateLike(h)) starts.push(i);
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

function parseNumberLike(value: unknown): number {
  const raw = String(value ?? '').trim();
  if (!raw) return 0;

  // Keep digits, dot, minus; drop commas, percent, currency symbols, spaces.
  const cleaned = raw.replace(/,/g, '').replace(/%/g, '').replace(/[^0-9.\-]/g, '');
  const num = Number.parseFloat(cleaned);
  return Number.isFinite(num) ? num : 0;
}

function inferValueTypeFromCells(values: Array<{ value: number }>): BonusValueType {
  // Best-effort default; UI formatting can still be overridden by sheetName heuristics.
  const maxAbs = values.reduce((m, v) => Math.max(m, Math.abs(v.value)), 0);
  return maxAbs > 100 ? 'amount' : 'percent';
}

function parseDate(dateStr: string): Date | null {
  // Handle "Day X" format (from our parsed data)
  const dayMatch = dateStr.match(/^Day\s+(\d{1,2})$/i);
  if (dayMatch) {
    // For "Day X" format, create a date in the current month
    const day = parseInt(dayMatch[1], 10);
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), day);
  }

  // Handle "Entry X" format (fallback entries without real dates)
  if (/^Entry\s+\d+$/i.test(dateStr)) {
    // Return a sequential date based on entry number
    const entryMatch = dateStr.match(/^Entry\s+(\d+)$/i);
    if (entryMatch) {
      const entryNum = parseInt(entryMatch[1], 10);
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth(), entryNum);
    }
  }

  // Try various date formats
  const formats = [
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // MM/DD/YYYY or DD/MM/YYYY
    /(\d{1,2})\/(\d{1,2})/, // MM/DD or DD/MM (assume current year)
    /(\d{4})-(\d{1,2})-(\d{1,2})/, // YYYY-MM-DD
  ];

  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      if (format === formats[2]) {
        return new Date(Number.parseInt(match[1], 10), Number.parseInt(match[2], 10) - 1, Number.parseInt(match[3], 10));
      }

      if (format === formats[1]) {
        const year = new Date().getFullYear();
        return new Date(year, Number.parseInt(match[1], 10) - 1, Number.parseInt(match[2], 10));
      }

      return new Date(Number.parseInt(match[3], 10), Number.parseInt(match[1], 10) - 1, Number.parseInt(match[2], 10));
    }
  }

  return null;
}

/**
 * Search for worker in horizontal block layout (DAILY & PERFORMANCE style sheets)
 * Structure: Each row has multiple day blocks side-by-side with format:
 * [Stage, WorkerID, Rate%, Bonus, DayNum, Rate%, RankingBonus, Total, "", ...]
 */
function searchHorizontalBlocks(data: SheetData, normalizedWorkerId: string, originalWorkerId: string): WorkerData | null {
  const labelRow = data.rows[0] || [];
  const dailyData: DailyBonus[] = [];
  let matchedUserName: string | null = null;

  // Detect block boundaries by finding repeating "STAGE" labels in row 0
  const blockStarts: number[] = [];
  for (let i = 0; i < labelRow.length; i++) {
    const label = normalizeLabel(labelRow[i]);
    if (label === 'stage' || label === 'stages') {
      blockStarts.push(i);
    }
  }

  // If no STAGE labels found, try to detect blocks by finding "COLLECTOR BONUS STANDARDS" in headers
  if (blockStarts.length === 0) {
    const headers = data.headers || [];
    let lastHeaderIdx = -20; // Track to avoid adjacent duplicates
    for (let i = 0; i < headers.length; i++) {
      const h = normalizeLabel(headers[i]);
      if (h.includes('collector bonus') || h.includes('bonus standards')) {
        if (i - lastHeaderIdx > 5) { // Minimum block width
          blockStarts.push(i);
          lastHeaderIdx = i;
        }
      }
    }
  }

  if (blockStarts.length === 0) return null;

  // Process each block
  for (let blockIdx = 0; blockIdx < blockStarts.length; blockIdx++) {
    const blockStart = blockStarts[blockIdx];
    const blockEnd = blockStarts[blockIdx + 1] ?? labelRow.length;

    // Find relevant column indices within this block
    // For DAILY & PERFORMANCE: columns are [Stage, Product/WorkerID, Rate, Recovery bonus, Rank rate, Rank rate, Ranking bonus, Weekly bonus, ...]
    // Worker ID is typically in column 1 or 2 of the block
    
    // Find column positions relative to block start
    let workerIdCol = -1;
    let totalBonusCol = -1;

    for (let i = blockStart; i < blockEnd; i++) {
      const label = normalizeLabel(labelRow[i]);
      if (label === 'product' || label.includes('user') || label.includes('name')) {
        workerIdCol = i;
      }
      if (label === 'weekly bonus' || label === 'total' || (label.includes('bonus') && label.includes('total'))) {
        totalBonusCol = i;
      }
    }

    // If we couldn't find labeled columns, use position-based heuristics
    // Block structure is typically: [Stage(0), WorkerID(1), Rate(2), Bonus(3), ..., Total(last-1)]
    if (workerIdCol === -1) {
      workerIdCol = blockStart + 1; // Second column in block
    }
    if (totalBonusCol === -1) {
      // Look for the last numeric-looking column before the empty separator
      for (let i = blockEnd - 1; i >= blockStart; i--) {
        const label = normalizeLabel(labelRow[i]);
        if (label.includes('bonus') || label.includes('total')) {
          totalBonusCol = i;
          break;
        }
      }
      if (totalBonusCol === -1) {
        totalBonusCol = blockEnd - 2; // Second to last column typically has total
      }
    }

    // Search all data rows for worker ID in this block
    for (const row of data.rows.slice(1)) {
      if (normalizeComparable(row[workerIdCol]) === normalizedWorkerId) {
        matchedUserName = matchedUserName ?? row[workerIdCol];
        const bonusValue = parseNumberLike(row[totalBonusCol]);
        
        // Determine date/day from the block (could be from header or row data)
        // Try to find a day number in nearby columns
        let dayNum = findNearbyDayNumber(row, blockStart, blockEnd);
        if (!dayNum) {
          // Use block index as fallback
          dayNum = blockIdx + 1;
        }
        
        if (bonusValue > 0) {
          dailyData.push({
            date: `Day ${dayNum}`,
            value: bonusValue,
          });
        }
        break; // Found worker in this block, move to next block
      }
    }
  }

  if (matchedUserName && dailyData.length > 0) {
    return {
      workerId: originalWorkerId,
      userName: matchedUserName,
      bucket: 'N/A',
      dailyData,
      valueType: 'amount',
    };
  }

  return null;
}

/**
 * Search for worker in WEEKLY BONUS style sheets
 * Structure:
 * - Headers: "WEEK 1", "WEEK 2", etc. (or empty with week labels below)
 * - Row 0: Sub-headers like "Average of Recovery rate case"
 * - Row 1: Column labels like "bucket", "user_name", dates like "9/16/2025", "Grand Total"
 * - Row 2+: Data with worker IDs in user_name columns
 */
function searchWeeklyBlocks(
  data: SheetData,
  headers: string[],
  normalizedWorkerId: string,
  originalWorkerId: string
): WorkerData | null {
  if (data.rows.length < 3) return null;

  const labelRow = data.rows[1]; // Row with "bucket", "user_name", dates
  if (!labelRow) return null;

  // Find all weekly blocks by looking for "user_name" columns
  const weekBlocks: Array<{ userNameCol: number; dateColumns: Array<{ col: number; date: string }> }> = [];

  for (let i = 0; i < labelRow.length; i++) {
    const label = normalizeLabel(labelRow[i]);
    if (label === 'user_name' || label === 'username' || label === 'name') {
      // Found a user_name column - find date columns after it until next user_name or end
      const dateColumns: Array<{ col: number; date: string }> = [];
      for (let j = i + 1; j < labelRow.length; j++) {
        const nextLabel = normalizeLabel(labelRow[j]);
        if (nextLabel === 'user_name' || nextLabel === 'username' || nextLabel === 'name' || nextLabel === 'bucket') {
          break; // Hit next block
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

  // Search for worker in each block
  const dailyData: DailyBonus[] = [];
  let matchedUserName: string | null = null;

  for (const block of weekBlocks) {
    // Search data rows (starting from row 2)
    for (const row of data.rows.slice(2)) {
      if (normalizeComparable(row[block.userNameCol]) === normalizedWorkerId) {
        matchedUserName = matchedUserName ?? row[block.userNameCol];
        // Extract values for each date column in this block
        for (const { col, date } of block.dateColumns) {
          const value = parseNumberLike(row[col]);
          // For weekly sheets, values are percentages, but we store them as-is
          dailyData.push({ date, value });
        }
        break; // Found worker in this block
      }
    }
  }

  if (matchedUserName && dailyData.length > 0) {
    // Determine if values are percentages (typically < 1 or have % in original)
    const valueType: BonusValueType = dailyData.every(d => d.value <= 100) ? 'percent' : 'amount';
    
    return {
      workerId: originalWorkerId,
      userName: matchedUserName,
      bucket: 'N/A',
      dailyData,
      valueType,
    };
  }

  return null;
}

/**
 * Find a day number in nearby columns of a row
 */
function findNearbyDayNumber(row: string[], startCol: number, endCol: number): number | null {
  for (let i = startCol; i < Math.min(endCol, row.length); i++) {
    const val = row[i]?.trim();
    // Look for pure numbers between 1-31 (day of month)
    if (/^\d{1,2}$/.test(val)) {
      const num = parseInt(val, 10);
      if (num >= 1 && num <= 31) {
        return num;
      }
    }
  }
  return null;
}
