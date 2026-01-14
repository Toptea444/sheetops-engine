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

    // 1) Try standard tabular layout (ID column + date headers)
    const workerIdIndex = findHeaderIndex(headers, [
      'user_id',
      'worker',
      'id',
      'username',
      'usernames',
      'stage',
      'stages',
    ]);

    if (workerIdIndex >= 0) {
      const userNameIndex = findHeaderIndex(headers, ['user_name', 'name', 'username', 'usernames']);
      const bucketIndex = findHeaderIndex(headers, ['bucket']);

      const dateColumns: { index: number; date: string }[] = [];
      headers.forEach((header, index) => {
        if (isDateLike(header)) dateColumns.push({ index, date: header });
      });

      const workerRow = data.rows.find((row) => normalizeComparable(row[workerIdIndex]) === normalizeComparable(workerId));
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

    // 2) Fallback: block layout (dates repeated across header row; labels repeated in first data row)
    //    Example: "RANKING BONUS" tab.
    if (data.rows.length < 2) return null;

    const labelRow = data.rows[0];
    const blocks = extractDateBlocks(headers);
    if (blocks.length === 0) return null;

    const dailyData: DailyBonus[] = [];
    let matchedId: string | null = null;
    let valueType: BonusValueType | undefined;

    for (const block of blocks) {
      const usernameCol = findLabelIndex(labelRow, block.start, block.end, ['usernames', 'username', 'user id', 'user_id', 'id']);
      const rankingBonusCol = findLabelIndex(labelRow, block.start, block.end, ['ranking bonus']);
      const fallbackBonusCol = findLabelIndex(labelRow, block.start, block.end, ['bonus']);
      const bonusCol = rankingBonusCol >= 0 ? rankingBonusCol : fallbackBonusCol;

      if (usernameCol < 0 || bonusCol < 0) continue;

      const bonusLabel = normalizeLabel(labelRow[bonusCol]);
      valueType = valueType ?? (bonusLabel.includes('%') || bonusLabel.includes('rate') ? 'percent' : 'amount');

      // Find matching row for this block
      const foundRow = data.rows.slice(1).find((row) => normalizeComparable(row[usernameCol]) === normalizeComparable(workerId));
      if (!foundRow) continue;

      matchedId = matchedId ?? (foundRow[usernameCol] || workerId);

      dailyData.push({
        date: block.date,
        value: parseNumberLike(foundRow[bonusCol]),
      });
    }

    if (!matchedId) return null;

    // Prefer amount for explicit ranking sheets
    if (data.sheetName.toLowerCase().includes('ranking')) valueType = 'amount';

    return {
      workerId: workerId,
      userName: matchedId,
      bucket: 'N/A',
      dailyData,
      valueType: valueType ?? inferValueTypeFromCells(dailyData),
    };
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
