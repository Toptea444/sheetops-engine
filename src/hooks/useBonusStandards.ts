import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BONUS_STANDARDS, type BonusStandard } from '@/utils/bonusStandards';

export function useBonusStandards() {
  const [standards, setStandards] = useState<Record<string, BonusStandard>>(BONUS_STANDARDS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStandards = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('bonus_standards')
        .select('*')
        .order('stage', { ascending: true });

      if (fetchError) throw fetchError;

      if (data && data.length > 0) {
        const loadedStandards: Record<string, BonusStandard> = {};
        data.forEach((row: any) => {
          loadedStandards[row.stage] = {
            stage: row.stage,
            tiers: {
              excellent: {
                threshold: Number(row.tier_excellent_threshold),
                bonus: row.tier_excellent_bonus,
                recoveryRate: row.tier_excellent_recovery_rate,
              },
              good: {
                threshold: Number(row.tier_good_threshold),
                bonus: row.tier_good_bonus,
                recoveryRate: row.tier_good_recovery_rate,
              },
              fair: {
                threshold: Number(row.tier_fair_threshold),
                bonus: row.tier_fair_bonus,
                recoveryRate: row.tier_fair_recovery_rate,
              },
              poor: {
                threshold: Number(row.tier_poor_threshold),
                bonus: row.tier_poor_bonus,
                recoveryRate: row.tier_poor_recovery_rate,
              },
            },
          };
        });
        setStandards(loadedStandards);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load bonus standards';
      setError(message);
      console.error('[v0] Error loading bonus standards:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStandards();
  }, [loadStandards]);

  return {
    standards,
    isLoading,
    error,
    refetch: loadStandards,
  };
}
