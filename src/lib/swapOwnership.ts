export interface IdSwap {
  id: string;
  worker_name: string;
  old_worker_id: string;
  new_worker_id: string;
  effective_date: string;
  cycle_key: string;
  notes: string | null;
  created_at: string;
  exchange_group?: string | null;
}

export type OwnershipMap = Record<string, Array<{ from: string | null; to: string | null }>>;

/**
 * Directional ID-change model: a swap record `old → new` on `effective_date`
 * means the person who held `old` uses `new` from that date onward.
 *
 * Starting from the ID the user is logged in with today, walk backwards:
 * find the latest change that moved someone INTO the tracked ID (on/before the
 * current window start). That ID is owned from that date; before it the user
 * held `old`. Repeat until no earlier change exists.
 *
 * Returns half-open [from, to) windows per ID (null = open-ended) plus the
 * swaps that form the user's chain (newest first).
 */
export function computeOwnership(uid: string, allSwaps: IdSwap[], todayLocal: string): { map: OwnershipMap; chain: IdSwap[] } {
  const map: OwnershipMap = {};
  const chain: IdSwap[] = [];
  const effective = allSwaps.filter(s => s.effective_date <= todayLocal);
  const used = new Set<string>();
  let tracked = uid.toUpperCase();
  let end: string | null = null;

  for (let guard = 0; guard < 50; guard++) {
    let best: IdSwap | null = null;
    for (const s of effective) {
      if (used.has(s.id)) continue;
      // The other half of a simultaneous exchange belongs to the other person.
      if (s.exchange_group && chain.some(previous => previous.exchange_group === s.exchange_group)) continue;
      if (s.new_worker_id.toUpperCase() !== tracked) continue;
      if (end !== null && s.effective_date > end) continue;
      if (!best || s.effective_date > best.effective_date ||
        (s.effective_date === best.effective_date && s.created_at > best.created_at)) {
        best = s;
      }
    }
    if (!best) break;
    used.add(best.id);
    chain.push(best);
    (map[tracked] ||= []).push({ from: best.effective_date, to: end });
    end = best.effective_date;
    tracked = best.old_worker_id.toUpperCase();
  }

  if (chain.length > 0) (map[tracked] ||= []).push({ from: null, to: end });
  return { map, chain };
}

