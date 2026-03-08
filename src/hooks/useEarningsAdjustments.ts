import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { BonusResult, DailyBonus } from '@/types/bonus';
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
}

export interface AdjustmentNote {
  type: 'swap_in' | 'swap_out' | 'transfer_credit' | 'transfer_debit';
  date: string;
  amount: number;
  description: string;
  created_at: string;
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

  const load = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const [swapRes, transferRes] = await Promise.all([
        supabase.from('id_swaps').select('*').order('effective_date', { ascending: true }),
        supabase.from('day_transfers').select('*').eq('cycle_key', cycleKey),
      ]);

      const allSwaps = (swapRes.data || []) as unknown as IdSwap[];
      const allTransfers = (transferRes.data || []) as unknown as DayTransfer[];

      setSwaps(allSwaps);
      setTransfers(allTransfers);

      // Build adjustment notes relevant to this user
      const notes: AdjustmentNote[] = [];
      const uid = userId.toUpperCase();

      allSwaps.forEach(s => {
        if (s.old_worker_id === uid) {
          notes.push({
            type: 'swap_out',
            date: s.effective_date,
            amount: 0,
            description: `ID swapped from ${s.old_worker_id} to ${s.new_worker_id} (${s.worker_name})${s.notes ? ` — ${s.notes}` : ''}`,
            created_at: s.created_at,
          });
        }
        if (s.new_worker_id === uid) {
          notes.push({
            type: 'swap_in',
            date: s.effective_date,
            amount: 0,
            description: `ID swapped from ${s.old_worker_id} to ${s.new_worker_id} (${s.worker_name})${s.notes ? ` — ${s.notes}` : ''}`,
            created_at: s.created_at,
          });
        }
      });

      allTransfers.forEach(t => {
        if (t.source_worker_id === uid) {
          notes.push({
            type: 'transfer_debit',
            date: t.transfer_date,
            amount: -t.amount,
            description: `Day earnings transferred to ${t.target_worker_id} on ${t.transfer_date} (${t.sheet_name})${t.reason ? ` — ${t.reason}` : ''}`,
            created_at: t.created_at,
          });
        }
        if (t.target_worker_id === uid) {
          notes.push({
            type: 'transfer_credit',
            date: t.transfer_date,
            amount: t.amount,
            description: `Day earnings received from ${t.source_worker_id} on ${t.transfer_date} (${t.sheet_name})${t.reason ? ` — ${t.reason}` : ''}`,
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
  }, [userId, cycleKey]);

  useEffect(() => { load(); }, [load]);

  /**
   * Apply corrections to results:
   * 1. ID Swaps: filter daily data based on date ownership
   * 2. Day Transfers: debit/credit the full transfer amount on the correct date
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
    const relevantSwaps = swaps.filter(s =>
      s.old_worker_id === uid || s.new_worker_id === uid
    );

    // Find transfers involving this user
    const userTransfers = transfers.filter(t =>
      t.source_worker_id === uid || t.target_worker_id === uid
    );

    const adjustedResults = results.map(result => {
      const resultId = result.workerId.toUpperCase();
      const adjusted = { ...result };
      
      // ── Swaps: filter daily breakdown based on ownership periods ──
      const swapsForThisId = relevantSwaps.filter(s => 
        s.old_worker_id === resultId || s.new_worker_id === resultId
      );
      
      if (swapsForThisId.length > 0) {
        adjusted.dailyBreakdown = result.dailyBreakdown.filter(day => {
          if (!day.fullDate) return true;
          const dayDate = new Date(day.fullDate);
          const dayStr = dayDate.toISOString().split('T')[0];
          
          for (const swap of swapsForThisId) {
            const effectiveStr = swap.effective_date;
            
            if (swap.old_worker_id === resultId && swap.old_worker_id === uid) {
              if (dayStr >= effectiveStr) return false;
            }
            if (swap.old_worker_id === resultId && swap.new_worker_id === uid) {
              if (dayStr < effectiveStr) return false;
            }
            if (swap.new_worker_id === resultId && swap.new_worker_id === uid) {
              if (dayStr < effectiveStr) return false;
            }
            if (swap.new_worker_id === resultId && swap.old_worker_id === uid) {
              if (dayStr >= effectiveStr) return false;
            }
          }
          return true;
        });
        
        adjusted.totalBonus = adjusted.dailyBreakdown.reduce((sum, d) => sum + d.value, 0);
      }
      
      // ── Transfers: apply debit/credit on the transfer_date ──
      // A transfer's sheet_name can now be a comma-separated list of sheets.
      // We match if any of the transfer's sheets overlap with this result's sheetName.
      userTransfers.forEach(t => {
        const transferSheets = t.sheet_name.split(',').map(s => s.trim());
        const resultSheet = result.sheetName || '';
        const sheetMatches = transferSheets.some(ts => ts === resultSheet);
        
        // For source: zero out the day's value on the matching date
        // Only apply once — match against the FIRST sheet in the list to avoid doubling
        if (t.source_worker_id === uid && resultId === uid) {
          // Only debit from the first matching sheet to avoid double-counting
          if (resultSheet === transferSheets[0] || (!sheetMatches && transferSheets[0] === transferSheets.join(', '))) {
            const transferDateStr = t.transfer_date;
            adjusted.dailyBreakdown = adjusted.dailyBreakdown.map(day => {
              if (!day.fullDate) return day;
              const dayStr = new Date(day.fullDate).toISOString().split('T')[0];
              if (dayStr === transferDateStr) {
                netAdjustment -= day.value;
                return { ...day, value: 0, bonus: 0, rankingBonus: 0, total: 0 };
              }
              return day;
            });
          }
        }
        
        // For target: add the transfer amount on the correct date
        // Only credit once — on the first matching sheet
        if (t.target_worker_id === uid) {
          // Find the first result's sheet that matches so we only add once
          const isFirstMatchingSheet = resultSheet === transferSheets[0] || 
            (!transferSheets.includes(resultSheet) && results.indexOf(result) === 0);
          
          if (isFirstMatchingSheet) {
            const transferDateStr = t.transfer_date;
            const transferDate = new Date(transferDateStr + 'T12:00:00');
            const existing = adjusted.dailyBreakdown.find(day => {
              if (!day.fullDate) return false;
              return new Date(day.fullDate).toISOString().split('T')[0] === transferDateStr;
            });
            
            if (existing) {
              existing.value += t.amount;
              if (existing.total !== undefined) existing.total += t.amount;
            } else {
              adjusted.dailyBreakdown.push({
                date: transferDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                fullDate: transferDate.getTime(),
                value: t.amount,
                bonus: 0,
                rankingBonus: 0,
                total: t.amount,
              });
            }
            netAdjustment += t.amount;
          }
        }
      });
      
      // Recalculate total after all adjustments
      adjusted.totalBonus = adjusted.dailyBreakdown.reduce((sum, d) => sum + d.value, 0);
      
      return adjusted;
    });

    return { adjustedResults, netAdjustment };
  }, [userId, swaps, transfers]);

  /**
   * Get transfer info for a specific worker and date, for showing +/- indicators
   */
  const getTransferInfoForDate = useCallback((workerId: string, dateStr: string): { 
    type: 'credit' | 'debit'; 
    amount: number 
  } | null => {
    if (!workerId) return null;
    const uid = workerId.toUpperCase();
    
    for (const t of transfers) {
      if (t.transfer_date === dateStr) {
        if (t.target_worker_id === uid) {
          return { type: 'credit', amount: t.amount };
        }
        if (t.source_worker_id === uid) {
          return { type: 'debit', amount: t.amount };
        }
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

    swaps.forEach(s => {
      if (s.new_worker_id === uid) {
        ids.add(s.old_worker_id);
      }
      if (s.old_worker_id === uid) {
        ids.add(s.new_worker_id);
      }
    });

    return Array.from(ids);
  }, [userId, swaps]);

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
