import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { SheetData } from '@/types/bonus';

const SPREADSHEET_ID = '18Vjztt0odhAMzZiqIv4_HgIl5ebrzh4p67NFMWOQyQg';
const TRANSPORT_SUBSIDY_SHEET = 'transport subsidy';

const COOKIE_SETUP_DONE = 'performanceTracker_transportSubsidySetupDone';
const COOKIE_OPTED_IN = 'performanceTracker_transportSubsidyOptedIn';
const COOKIE_K_ID = 'performanceTracker_transportSubsidyKId';

export interface TransportSubsidyData {
  name: string;
  position: string;
  workingDays: number;
  daysPresent: number;
  attendanceRate: string;
  subsidyStandard: number;
  actualSubsidy: number;
}

function getCookie(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function setCookie(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

export function useTransportSubsidy() {
  const [isLoading, setIsLoading] = useState(false);
  const [subsidyData, setSubsidyData] = useState<TransportSubsidyData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isSetupDone = getCookie(COOKIE_SETUP_DONE) === 'true';
  const isOptedIn = getCookie(COOKIE_OPTED_IN) === 'true';
  const savedKId = getCookie(COOKIE_K_ID);

  const markSetupDone = useCallback((optedIn: boolean, kId?: string) => {
    setCookie(COOKIE_SETUP_DONE, 'true');
    setCookie(COOKIE_OPTED_IN, optedIn ? 'true' : 'false');
    if (kId) setCookie(COOKIE_K_ID, kId);
  }, []);

  const fetchSubsidyData = useCallback(async (kId: string): Promise<TransportSubsidyData | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('fetch-google-sheets', {
        body: { action: 'getSheetData', spreadsheetId: SPREADSHEET_ID, sheetName: TRANSPORT_SUBSIDY_SHEET },
      });

      if (fnError) throw new Error('Failed to fetch transport subsidy data');
      if (data?.error) throw new Error(data.error);

      const sheetData: SheetData = {
        headers: (data?.headers || []).map((h: unknown) => String(h ?? '')),
        rows: (data?.rows || []).map((row: unknown[]) => row.map((c) => String(c ?? ''))),
        sheetName: TRANSPORT_SUBSIDY_SHEET,
      };

      // Parse the sheet - find the row matching the K ID
      // Headers: S/N | ID | Name | Position | working days | Days Present | Attendance rate | Subsidy standard | Actual subsidy
      const headers = sheetData.headers.map(h => h.trim().toUpperCase());
      
      // Find column indices
      const idCol = headers.findIndex(h => h === 'ID');
      const nameCol = headers.findIndex(h => h === 'NAME');
      const positionCol = headers.findIndex(h => h === 'POSITION');
      const workingDaysCol = headers.findIndex(h => h.includes('WORKING') && h.includes('DAYS'));
      const daysPresentCol = headers.findIndex(h => h.includes('DAYS') && h.includes('PRESENT'));
      const attendanceCol = headers.findIndex(h => h.includes('ATTENDANCE'));
      const subsidyStdCol = headers.findIndex(h => h.includes('SUBSIDY') && h.includes('STANDARD'));
      const actualSubsidyCol = headers.findIndex(h => h.includes('ACTUAL') && h.includes('SUBSIDY'));

      if (idCol === -1) {
        throw new Error('Could not find ID column in transport subsidy sheet');
      }

      const normalizedKId = kId.trim().toUpperCase();

      for (const row of sheetData.rows) {
        const cellId = String(row[idCol] ?? '').trim().toUpperCase();
        if (cellId === normalizedKId) {
          const result: TransportSubsidyData = {
            name: nameCol >= 0 ? String(row[nameCol] ?? '').trim() : '',
            position: positionCol >= 0 ? String(row[positionCol] ?? '').trim() : '',
            workingDays: workingDaysCol >= 0 ? parseInt(String(row[workingDaysCol] ?? '0')) || 0 : 0,
            daysPresent: daysPresentCol >= 0 ? parseInt(String(row[daysPresentCol] ?? '0')) || 0 : 0,
            attendanceRate: attendanceCol >= 0 ? String(row[attendanceCol] ?? '').trim() : '0%',
            subsidyStandard: subsidyStdCol >= 0 ? parseInt(String(row[subsidyStdCol] ?? '0').replace(/,/g, '')) || 0 : 0,
            actualSubsidy: actualSubsidyCol >= 0 ? parseInt(String(row[actualSubsidyCol] ?? '0').replace(/,/g, '')) || 0 : 0,
          };
          setSubsidyData(result);
          setIsLoading(false);
          return result;
        }
      }

      setError(`ID "${kId}" not found in the transport subsidy sheet.`);
      setIsLoading(false);
      return null;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch subsidy data';
      setError(msg);
      setIsLoading(false);
      return null;
    }
  }, []);

  return {
    isLoading,
    subsidyData,
    error,
    isSetupDone,
    isOptedIn,
    savedKId,
    markSetupDone,
    fetchSubsidyData,
    setSubsidyData,
    setError,
  };
}
