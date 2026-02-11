import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getCycleKey } from '@/lib/cycleUtils';
import type { CyclePeriod } from '@/lib/cycleUtils';
import type { BonusResult, SheetData } from '@/types/bonus';

/**
 * Hook for caching cycle data in the database.
 * - Saves worker results & full sheet snapshots on every successful fetch.
 * - Falls back to cached data when a sheet becomes disabled/inaccessible.
 */
export function useCycleCache() {
  /**
   * Save a worker's BonusResult for a specific sheet + cycle.
   */
  const saveWorkerResult = useCallback(
    async (workerId: string, sheetName: string, cycle: CyclePeriod, result: BonusResult) => {
      const key = getCycleKey(cycle);
      try {
        const { error } = await supabase.from('cycle_worker_cache' as any).upsert(
          {
            worker_id: workerId,
            sheet_name: sheetName,
            cycle_key: key,
            result_data: result as any,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'worker_id,sheet_name,cycle_key' }
        );
        if (error) console.warn('[CycleCache] save worker result error:', error.message);
      } catch (e) {
        console.warn('[CycleCache] save worker result failed:', e);
      }
    },
    []
  );

  /**
   * Save a full sheet data snapshot for a specific sheet + cycle.
   */
  const saveSheetSnapshot = useCallback(
    async (sheetName: string, cycle: CyclePeriod, sheetData: SheetData) => {
      const key = getCycleKey(cycle);
      try {
        const { error } = await supabase.from('cycle_sheet_cache' as any).upsert(
          {
            sheet_name: sheetName,
            cycle_key: key,
            sheet_data: sheetData as any,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'sheet_name,cycle_key' }
        );
        if (error) console.warn('[CycleCache] save sheet snapshot error:', error.message);
      } catch (e) {
        console.warn('[CycleCache] save sheet snapshot failed:', e);
      }
    },
    []
  );

  /**
   * Load cached worker results for a worker across all sheets for a given cycle.
   */
  const loadWorkerResults = useCallback(
    async (workerId: string, cycleKey: string): Promise<BonusResult[]> => {
      try {
        const { data, error } = await supabase
          .from('cycle_worker_cache' as any)
          .select('result_data, sheet_name')
          .eq('worker_id', workerId)
          .eq('cycle_key', cycleKey);

        if (error) {
          console.warn('[CycleCache] load worker results error:', error.message);
          return [];
        }

        return (data || []).map((row: any) => ({
          ...row.result_data,
          sheetName: row.sheet_name,
        }));
      } catch (e) {
        console.warn('[CycleCache] load worker results failed:', e);
        return [];
      }
    },
    []
  );

  /**
   * Load a cached sheet snapshot for a specific sheet + cycle.
   */
  const loadSheetSnapshot = useCallback(
    async (sheetName: string, cycleKey: string): Promise<SheetData | null> => {
      try {
        const { data, error } = await supabase
          .from('cycle_sheet_cache' as any)
          .select('sheet_data')
          .eq('sheet_name', sheetName)
          .eq('cycle_key', cycleKey)
          .maybeSingle();

        if (error) {
          console.warn('[CycleCache] load sheet snapshot error:', error.message);
          return null;
        }

        return data ? (data as any).sheet_data as SheetData : null;
      } catch (e) {
        console.warn('[CycleCache] load sheet snapshot failed:', e);
        return null;
      }
    },
    []
  );

  /**
   * Load all cached sheet snapshots for a given cycle.
   */
  const loadAllSheetSnapshots = useCallback(
    async (cycleKey: string): Promise<Record<string, SheetData>> => {
      try {
        const { data, error } = await supabase
          .from('cycle_sheet_cache' as any)
          .select('sheet_name, sheet_data')
          .eq('cycle_key', cycleKey);

        if (error) {
          console.warn('[CycleCache] load all snapshots error:', error.message);
          return {};
        }

        const result: Record<string, SheetData> = {};
        (data || []).forEach((row: any) => {
          result[row.sheet_name] = row.sheet_data as SheetData;
        });
        return result;
      } catch (e) {
        console.warn('[CycleCache] load all snapshots failed:', e);
        return {};
      }
    },
    []
  );

  return {
    saveWorkerResult,
    saveSheetSnapshot,
    loadWorkerResults,
    loadSheetSnapshot,
    loadAllSheetSnapshots,
  };
}
