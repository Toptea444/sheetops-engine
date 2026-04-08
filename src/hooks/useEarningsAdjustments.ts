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
        // Fetch ALL swaps for this user across all cycles — a swap on cycle N
        // affects how data is read when viewing cycle N-1 or any other cycle,
        // so filtering by cycle_key here would cause double-counting when browsing
        // historical cycles.
        supabase
          .from('id_swaps')
          .select('*')
          .or(`old_worker_id.eq.${userId.toUpperCase()},new_worker_id.eq.${userId.toUpperCase()}`)
          .order('effective_date', { ascending: true }),
        // Day transfers remain cycle-scoped (they are specific financial corrections
        // that only apply within the cycle they were recorded for)
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
   * Build a list of date windows during which `uid` owned `workerId`.
   *
   * Swaps are processed in chronological order. Each swap toggles ownership:
   * before the first swap the original owner has [start, swap1), the other
   * side has [swap1, swap2), the first owner again [swap2, swap3), etc.
   *
   * Returns an array of [from, to) string pairs (inclusive from, exclusive to).
   * `null` means open-ended (i.e. "until today / forever").
   *
   * Example — A and B swap twice in a cycle:
   *   Swap 1 effective Mar 20: A→B, B→A  (user B now uses A's old ID)
   *   Swap 2 effective Apr 01: A→B, B→A  (swapped back)
   *
   * For a user currently logged in as B:
   *   workerId A windows: [Mar 20, Apr 01)   ← B was "A" during that window
   *   workerId B windows: [start, Mar 20) ∪ [Apr 01, ∞)
   */
  const buildOwnershipWindows = useCallback((
    uid: string,
    workerId: string,
    sortedEffectiveSwaps: IdSwap[],
  ): Array<{ from: string | null; to: string | null }> => {
    // Collect only swaps that involve BOTH uid and workerId
    const relevantSwaps = sortedEffectiveSwaps.filter(s =>
      (s.old_worker_id === uid || s.new_worker_id === uid) &&
      (s.old_worker_id === workerId || s.new_worker_id === workerId)
    );

    if (relevantSwaps.length === 0) {
      // No swaps between uid and workerId at all
      // uid owns workerId only if they are the same
      if (uid === workerId) return [{ from: null, to: null }];
      return [];
    }

    // Walk the timeline: at each swap, ownership of workerId toggles between uid and the other party.
    // Determine whether uid owned workerId just BEFORE the first swap.
    const firstSwap = relevantSwaps[0];
    // Before the first swap: uid owned workerId iff uid === workerId
    let uidOwnsIt = uid === workerId;

    const windows: Array<{ from: string | null; to: string | null }> = [];
    let windowStart: string | null = uidOwnsIt ? null : undefined as any;

    for (const swap of relevantSwaps) {
      // Ownership flips at this swap's effective_date
      if (uidOwnsIt) {
        // uid was owning workerId up to (exclusive) this swap — close the window
        windows.push({ from: windowStart, to: swap.effective_date });
        uidOwnsIt = false;
      } else {
        // uid gains ownership of workerId from this swap's effective_date
        windowStart = swap.effective_date;
        uidOwnsIt = true;
      }
    }

    // If uid still owns workerId after all swaps, the window is open-ended
    if (uidOwnsIt) {
      windows.push({ from: windowStart, to: null });
    }

    return windows;
  }, []);

  /**
   * Apply corrections to results:
   * 1. ID Swaps: filter daily data based on ownership windows (handles multiple swaps)
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

    // Swaps sorted ascending by effective_date (already ordered from DB query)
    const effectiveSwaps = swaps
      .filter(s => s.effective_date <= todayLocal)
      .sort((a, b) => a.effective_date.localeCompare(b.effective_date));

    // Check if any swaps involve this user at all
    const userInvolvedInAnySwap = effectiveSwaps.some(
      s => s.old_worker_id === uid || s.new_worker_id === uid
    );

    // Find transfers involving this user
    const userTransfers = transfers.filter(t =>
      t.source_worker_id === uid || t.target_worker_id === uid
    );

    const adjustedResults = results.map(result => {
      const resultId = result.workerId.toUpperCase();
      const adjusted = { ...result };
      const resultSheet = result.sheetName || '';
      
      // ── Swaps: filter daily breakdown based on ownership windows ──
      if (userInvolvedInAnySwap) {
        // Build ownership windows: when did uid own this resultId?
        const windows = buildOwnershipWindows(uid, resultId, effectiveSwaps);

        if (windows.length === 0) {
          // uid never owned this resultId — drop all days
          adjusted.dailyBreakdown = [];
        } else {
          adjusted.dailyBreakdown = result.dailyBreakdown.filter(day => {
            if (!day.fullDate) return true;
            const dayStr = toLocalDateStr(day.fullDate);
            // Keep the day if it falls within ANY ownership window
            return windows.some(w => {
              const afterFrom = w.from === null || dayStr >= w.from;
              const beforeTo  = w.to   === null || dayStr <  w.to;
              return afterFrom && beforeTo;
            });
          });
        }

        // Tag kept days with their source worker ID if it differs from current ID
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
   * should fetch data for (current + any IDs they ever owned, per swap history).
   * Uses ownership windows so double-swaps on the same pair don't incorrectly
   * include IDs the user no longer owns (though we still fetch all historically
   * owned IDs since applyAdjustments will filter to the correct windows).
   */
  const getWorkerIdsToFetch = useCallback((): string[] => {
    if (!userId) return [];
    const uid = userId.toUpperCase();
    const ids = new Set<string>([uid]);

    const effectiveSwaps = swaps
      .filter(s => s.effective_date <= todayLocal)
      .sort((a, b) => a.effective_date.localeCompare(b.effective_date));

    // Collect all IDs that uid has ever been involved in swapping with
    const counterpartIds = new Set<string>();
    effectiveSwaps.forEach(s => {
      if (s.new_worker_id === uid) counterpartIds.add(s.old_worker_id);
      if (s.old_worker_id === uid) counterpartIds.add(s.new_worker_id);
    });

    // For each counterpart ID, check if uid has any ownership windows for it
    counterpartIds.forEach(otherId => {
      const windows = buildOwnershipWindows(uid, otherId, effectiveSwaps);
      if (windows.length > 0) {
        ids.add(otherId);
      }
    });

    return Array.from(ids);
  }, [userId, swaps, todayLocal, buildOwnershipWindows]);

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
