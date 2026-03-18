import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { BonusResult } from '@/types/bonus';
import type { CyclePeriod } from '@/lib/cycleUtils';
import { getCycleKey } from '@/lib/cycleUtils';

export interface IdSwap {
  id: string;
  worker_name: string;
  old_worker_id: string;
  new_worker_id: string;
  effective_date: string;
  cycle_key: string;
  notes: string | null;
  created_at: string;
}

export interface DayTransfer {
  id: string;
  source_worker_id: string;
  target_worker_id: string;
  transfer_date: string;
  sheet_name: string;
  amount: number;
  bonus_amount: number;
  ranking_bonus_amount: number;
  cycle_key: string;
  reason: string | null;
  created_at: string;
  sheet_amounts?: Record<string, number> | null;
}

export interface AdjustmentNote {
  type: 'swap_in' | 'swap_out' | 'transfer_credit' | 'transfer_debit';
  date: string;
  amount: number;
  description: string;
  created_at: string;
}

/** Convert a timestamp to YYYY-MM-DD in local time (avoids UTC shift) */
const toLocalDateStr = (ts: number) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Get per-sheet amount from a transfer. Falls back to total amount if no sheet_amounts. */
function getTransferAmountForSheet(t: DayTransfer, sheetName: string): number {
  if (t.sheet_amounts && typeof t.sheet_amounts === 'object') {
    const amt = (t.sheet_amounts as Record<string, number>)[sheetName];
    if (amt !== undefined) return amt;
    // If sheet not found in sheet_amounts, this transfer doesn't apply to this sheet
    return 0;
  }
  // Legacy: single-sheet record — match by sheet_name
  if (t.sheet_name === sheetName) return t.amount;
  return 0;
}

/** Check if a transfer applies to a given sheet */
function transferAppliesToSheet(t: DayTransfer, sheetName: string): boolean {
  if (t.sheet_amounts && typeof t.sheet_amounts === 'object') {
    return sheetName in (t.sheet_amounts as Record<string, number>);
  }
  return t.sheet_name === sheetName;
}

/**
 * Fetches swaps & transfers from the DB and provides a function
 * to apply them as corrections to raw sheet-based BonusResults.
 */
export function useEarningsAdjustments(userId: string | null, cycle: CyclePeriod) {
  const [swaps, setSwaps] = useState<IdSwap[]>([]);
  const [transfers, setTransfers] = useState<DayTransfer[]>([]);
  const [adjustmentNotes, setAdjustmentNotes] = useState<AdjustmentNote[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const cycleKey = getCycleKey(cycle);
  const todayLocal = toLocalDateStr(Date.now());

  const load = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const [swapRes, transferRes] = await Promise.all([
        supabase
          .from('id_swaps')
          .select('*')
          .eq('cycle_key', cycleKey)
          .order('effective_date', { ascending: true }),
        supabase.from('day_transfers').select('*').eq('cycle_key', cycleKey),
      ]);

      const allSwaps = (swapRes.data || []) as unknown as IdSwap[];
      const allTransfers = (transferRes.data || []) as unknown as DayTransfer[];
      const effectiveSwaps = allSwaps.filter(s => s.effective_date <= todayLocal);

      setSwaps(allSwaps);
      setTransfers(allTransfers);

      // Build adjustment notes relevant to this user
      const notes: AdjustmentNote[] = [];
      const uid = userId.toUpperCase();

      effectiveSwaps.forEach(s => {
        // In a bidirectional swap: two workers exchange IDs
        // Swap record stores: old_worker_id <-> new_worker_id
        // 
        // From the swap record perspective:
        // - The person who HAD old_worker_id NOW uses new_worker_id
        // - The person who HAD new_worker_id NOW uses old_worker_id
        //
        // So for the current user (uid):
        // - If uid === new_worker_id: user's OLD ID was old_worker_id, NEW ID is new_worker_id
        // - If uid === old_worker_id: user's OLD ID was new_worker_id, NEW ID is old_worker_id
        let userOldId: string, userNewId: string;
        if (s.new_worker_id === uid) {
          // User is now logged in with new_worker_id, meaning they came FROM old_worker_id
          userOldId = s.old_worker_id;
          userNewId = s.new_worker_id;
        } else if (s.old_worker_id === uid) {
          // User is now logged in with old_worker_id, meaning they came FROM new_worker_id
          userOldId = s.new_worker_id;
          userNewId = s.old_worker_id;
        } else {
          return;
        }
        const dateLabel = new Date(s.effective_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        notes.push({
          type: 'swap_in',
          date: s.effective_date,
          amount: 0,
          description: `Your ID was swapped from ${userOldId} to ${userNewId} on ${dateLabel}. Earnings before ${dateLabel} are from your previous ID (${userOldId}), and earnings from ${dateLabel} onward are under your current ID (${userNewId}).${s.notes ? ` Note: ${s.notes}` : ''}`,
          created_at: s.created_at,
        });
      });

      allTransfers.forEach(t => {
        const dateLabel = new Date(t.transfer_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (t.source_worker_id === uid) {
          notes.push({
            type: 'transfer_debit',
            date: t.transfer_date,
            amount: -t.amount,
            description: `${t.target_worker_id} worked for you on ${dateLabel}. Earnings for that day transferred to them.`,
            created_at: t.created_at,
          });
        }
        if (t.target_worker_id === uid) {
          notes.push({
            type: 'transfer_credit',
            date: t.transfer_date,
            amount: t.amount,
            description: `You worked for ${t.source_worker_id} on ${dateLabel}. Earnings for that day transferred to you.`,
            created_at: t.created_at,
          });
        }
      });

      notes.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setAdjustmentNotes(notes);
    } catch (e) {
      console.error('Failed to load adjustments', e);
    } finally {
      setIsLoading(false);
    }
  }, [userId, cycleKey, todayLocal]);

  useEffect(() => { load(); }, [load]);

  /**
   * Apply corrections to results:
   * 1. ID Swaps: filter daily data based on date ownership
   * 2. Day Transfers: debit/credit the per-sheet amount on the correct date
   * Returns adjusted results + net adjustment amount.
   */
  const applyAdjustments = useCallback((results: BonusResult[]): {
    adjustedResults: BonusResult[];
    netAdjustment: number;
  } => {
    if (!userId) return { adjustedResults: results, netAdjustment: 0 };

    const uid = userId.toUpperCase();
    let netAdjustment = 0;

    // Find swap chains involving this user
    const effectiveSwaps = swaps.filter(s => s.effective_date <= todayLocal);
    const relevantSwaps = effectiveSwaps.filter(s =>
      s.old_worker_id === uid || s.new_worker_id === uid
    );

    // Find transfers involving this user
    const userTransfers = transfers.filter(t =>
      t.source_worker_id === uid || t.target_worker_id === uid
    );

    const adjustedResults = results.map(result => {
      const resultId = result.workerId.toUpperCase();
      const adjusted = { ...result };
      const resultSheet = result.sheetName || '';
      
      // ── Swaps: filter daily breakdown based on ownership periods ──
      const swapsForThisId = relevantSwaps.filter(s => 
        s.old_worker_id === resultId || s.new_worker_id === resultId
      );
      
      if (swapsForThisId.length > 0) {
        adjusted.dailyBreakdown = result.dailyBreakdown.filter(day => {
          if (!day.fullDate) return true;
          const dayStr = toLocalDateStr(day.fullDate);
          
          for (const swap of swapsForThisId) {
            const effectiveStr = swap.effective_date;

            // Determine this specific user's perspective of the swap:
            // - userOldId: account this user had before swap
            // - userNewId: account this user has after swap (normally current uid)
            const userOldId = swap.new_worker_id === uid ? swap.old_worker_id : swap.new_worker_id;
            const userNewId = swap.new_worker_id === uid ? swap.new_worker_id : swap.old_worker_id;

            if (resultId === userOldId) {
              // User's old account data is valid only BEFORE effective date
              if (dayStr >= effectiveStr) return false;
            }
            if (resultId === userNewId) {
              // User's new account data is valid only FROM effective date onward
              if (dayStr < effectiveStr) return false;
            }
          }
          return true;
        });

        // Tag kept days with their source worker ID if it differs from the user's current ID
        if (resultId !== uid) {
          adjusted.dailyBreakdown = adjusted.dailyBreakdown.map(day => ({
            ...day,
            sourceWorkerId: resultId,
          }));
        }
        
        adjusted.totalBonus = adjusted.dailyBreakdown.reduce((sum, d) => sum + d.value, 0);
      }
      
      // ── Transfers: apply debit/credit using per-sheet amounts ──
      userTransfers.forEach(t => {
        // Check if this transfer applies to this specific sheet
        if (!transferAppliesToSheet(t, resultSheet)) return;
        
        const perSheetAmount = getTransferAmountForSheet(t, resultSheet);
        if (perSheetAmount <= 0) return;
        
        const transferDateStr = t.transfer_date;
        
        // For source: zero out the day's value on the matching date
        if (t.source_worker_id === uid && resultId === uid) {
          adjusted.dailyBreakdown = adjusted.dailyBreakdown.map(day => {
            if (!day.fullDate) return day;
            const dayStr = toLocalDateStr(day.fullDate);
            if (dayStr === transferDateStr) {
              netAdjustment -= day.value;
              return { ...day, value: 0, bonus: 0, rankingBonus: 0, total: 0 };
            }
            return day;
          });
        }
        
        // For target: add the per-sheet transfer amount on the correct date
        if (t.target_worker_id === uid && resultId === uid) {
          const existing = adjusted.dailyBreakdown.find(day => {
            if (!day.fullDate) return false;
            return toLocalDateStr(day.fullDate) === transferDateStr;
          });
          
          if (existing) {
            existing.value += perSheetAmount;
            if (existing.bonus !== undefined) existing.bonus += perSheetAmount;
            if (existing.total !== undefined) existing.total += perSheetAmount;
          } else {
            const transferDate = new Date(transferDateStr + 'T12:00:00');
            adjusted.dailyBreakdown.push({
              date: transferDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              fullDate: transferDate.getTime(),
              value: perSheetAmount,
              bonus: perSheetAmount,
              rankingBonus: 0,
              total: perSheetAmount,
            });
          }
          netAdjustment += perSheetAmount;
        }
      });
      
      // Recalculate total after all adjustments
      adjusted.totalBonus = adjusted.dailyBreakdown.reduce((sum, d) => sum + d.value, 0);
      
      return adjusted;
    });

    return { adjustedResults, netAdjustment };
  }, [userId, swaps, transfers, todayLocal]);

  /**
   * Get transfer info for a specific worker, date, and sheet for showing +/- indicators
   */
  const getTransferInfoForDate = useCallback((workerId: string, dateStr: string, sheetName?: string): { 
    type: 'credit' | 'debit'; 
    amount: number 
  } | null => {
    if (!workerId) return null;
    const uid = workerId.toUpperCase();
    
    for (const t of transfers) {
      if (t.transfer_date !== dateStr) continue;
      
      const sheet = sheetName || '';
      if (sheet && !transferAppliesToSheet(t, sheet)) continue;
      
      const perSheetAmount = sheet ? getTransferAmountForSheet(t, sheet) : t.amount;
      if (perSheetAmount <= 0) continue;
      
      if (t.target_worker_id === uid) {
        return { type: 'credit', amount: perSheetAmount };
      }
      if (t.source_worker_id === uid) {
        return { type: 'debit', amount: perSheetAmount };
      }
    }
    return null;
  }, [transfers]);

  /**
   * For swap scenarios: get the list of ALL worker IDs this user
   * should fetch data for (current + any previous IDs from swaps)
   */
  const getWorkerIdsToFetch = useCallback((): string[] => {
    if (!userId) return [];
    const uid = userId.toUpperCase();
    const ids = new Set<string>([uid]);

    const effectiveSwaps = swaps.filter(s => s.effective_date <= todayLocal);
    effectiveSwaps.forEach(s => {
      if (s.new_worker_id === uid) {
        ids.add(s.old_worker_id);
      }
      if (s.old_worker_id === uid) {
        ids.add(s.new_worker_id);
      }
    });

    return Array.from(ids);
  }, [userId, swaps, todayLocal]);

  return {
    swaps,
    transfers,
    adjustmentNotes,
    isLoading,
    applyAdjustments,
    getWorkerIdsToFetch,
    getTransferInfoForDate,
    reload: load,
  };
}
