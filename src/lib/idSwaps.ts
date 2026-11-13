import { supabase } from '@/integrations/supabase/client';

import { selectSwapAway, type SwapAway } from './swapDetection';

const toLocalDateStr = (ts: number) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export async function findSwapAwayFrom(uid: string): Promise<SwapAway | null> {
  const id = uid.toUpperCase();
  const today = toLocalDateStr(Date.now());
  const { data, error } = await supabase
    .from('id_swaps')
    .select('*')
    .or(`old_worker_id.eq.${id},new_worker_id.eq.${id}`)
    .lte('effective_date', today)
    .order('effective_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  return selectSwapAway(id, data || []);
}
