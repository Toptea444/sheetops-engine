export interface SwapAway {
  id: string;
  old_worker_id: string;
  new_worker_id: string;
  effective_date: string;
  exchange_group?: string | null;
}


/** Returns the last effective outgoing move for an already-known holder. */
export function selectSwapAway<T extends SwapAway>(id: string, rows: T[]): T | null {
  const latest = rows[0];
  if (!latest) return null;
  const uid = id.toUpperCase();
  if (latest.exchange_group) {
    return rows.find(row => row.exchange_group === latest.exchange_group && row.old_worker_id.toUpperCase() === uid) || null;
  }
  return latest.old_worker_id.toUpperCase() === uid ? latest : null;
}

