import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { SheetInfo, SheetData, WorkerData, BonusResult, DailyBonus } from '@/types/bonus';

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
        body: { action: 'getSheets', spreadsheetId: SPREADSHEET_ID }
      });

      if (fnError) throw fnError;
      if (data.error) throw new Error(data.error);

      setSheets(data.sheets || []);
      return data.sheets;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch sheets';
      setError(message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchSheetData = useCallback(async (sheetName: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('fetch-google-sheets', {
        body: { action: 'getSheetData', spreadsheetId: SPREADSHEET_ID, sheetName }
      });

      if (fnError) throw fnError;
      if (data.error) throw new Error(data.error);

      const result: SheetData = {
        headers: data.headers || [],
        rows: data.rows || [],
        sheetName: sheetName
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
    if (!data || !data.rows.length) return null;

    const headers = data.headers;
    const workerIdIndex = headers.findIndex(h => 
      h.toLowerCase().includes('user_id') || h.toLowerCase().includes('worker') || h.toLowerCase() === 'id'
    );
    const userNameIndex = headers.findIndex(h => 
      h.toLowerCase().includes('user_name') || h.toLowerCase().includes('name')
    );
    const bucketIndex = headers.findIndex(h => 
      h.toLowerCase().includes('bucket')
    );

    // Find date columns (columns after the identifying columns)
    const dateColumns: { index: number; date: string }[] = [];
    headers.forEach((header, index) => {
      // Check if header looks like a date (contains numbers and slashes or dashes)
      if (/\d{1,2}[\/\-]\d{1,2}/.test(header) || /\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}/.test(header)) {
        dateColumns.push({ index, date: header });
      }
    });

    // Search for the worker
    const workerRow = data.rows.find(row => {
      const id = row[workerIdIndex]?.toString().trim().toUpperCase();
      return id === workerId.trim().toUpperCase();
    });

    if (!workerRow) return null;

    const dailyData: DailyBonus[] = dateColumns.map(({ index, date }) => ({
      date,
      value: parseFloat(workerRow[index]) || 0
    }));

    return {
      workerId: workerRow[workerIdIndex] || workerId,
      userName: workerRow[userNameIndex] || 'Unknown',
      bucket: workerRow[bucketIndex] || 'N/A',
      dailyData
    };
  }, []);

  const calculateBonus = useCallback((
    worker: WorkerData,
    startDate: Date,
    endDate: Date
  ): BonusResult => {
    // Filter daily data within the date range
    const filteredData = worker.dailyData.filter(d => {
      const date = parseDate(d.date);
      if (!date) return false;
      return date >= startDate && date <= endDate;
    });

    const totalBonus = filteredData.reduce((sum, d) => sum + d.value, 0);

    return {
      workerId: worker.workerId,
      userName: worker.userName,
      bucket: worker.bucket,
      totalBonus,
      dailyBreakdown: filteredData,
      dateRange: {
        start: startDate.toLocaleDateString(),
        end: endDate.toLocaleDateString()
      }
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
    calculateBonus
  };
}

function parseDate(dateStr: string): Date | null {
  // Try various date formats
  const formats = [
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // MM/DD/YYYY or DD/MM/YYYY
    /(\d{1,2})\/(\d{1,2})/, // MM/DD or DD/MM (assume current year)
    /(\d{4})-(\d{1,2})-(\d{1,2})/ // YYYY-MM-DD
  ];

  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      if (format === formats[2]) {
        // YYYY-MM-DD
        return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
      } else if (format === formats[1]) {
        // MM/DD - assume current year
        const year = new Date().getFullYear();
        return new Date(year, parseInt(match[1]) - 1, parseInt(match[2]));
      } else {
        // MM/DD/YYYY
        return new Date(parseInt(match[3]), parseInt(match[1]) - 1, parseInt(match[2]));
      }
    }
  }
  return null;
}
