import { supabase } from '@/integrations/supabase/client';

export interface SwapAway {
  id: string;
  old_worker_id: string;
  new_worker_id: string;
  effective_date: string;
}

const toLocalDateStr = (ts: number) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * Returns the swap that moved `uid` to another ID, if that is the latest
 * effective change touching `uid`. If a later change moved someone INTO `uid`,
 * the ID is in use by its new holder and nothing is returned.
 */
export async function findSwapAwayFrom(uid: string): Promise<SwapAway | null> {
  const id = uid.toUpperCase();
  const today = toLocalDateStr(Date.now());
  const { data } = await supabase
    .from('id_swaps')
    .select('id, old_worker_id, new_worker_id, effective_date, created_at')
    .or(`old_worker_id.eq.${id},new_worker_id.eq.${id}`)
    .lte('effective_date', today)
    .order('effective_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1);
  const latest = data?.[0];
  if (!latest) return null;
  return latest.old_worker_id.toUpperCase() === id ? latest : null;
}
