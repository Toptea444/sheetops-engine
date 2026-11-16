import { parseStageFromWorkerId, type WorkerStage } from './workerIdStage';
import { computeOwnership, type IdSwap, type OwnershipMap } from './swapOwnership';
import type { SheetData } from '../types/bonus';

export type Collector = { id: string; stage: WorkerStage | null; generation: 'Old' | 'New' | null };

/** Build a deduplicated index once per tab. Only whole cells in known ID
 * formats are considered; other text/headers are not treated as collectors. */
export function listCollectors(data: SheetData): Collector[] {
  const ids = new Set<string>();
  for (const row of [data.headers, ...data.rows]) for (const value of row) {
    const id = String(value ?? '').trim().toUpperCase();
    if (/^[A-Z]{2,8}(?:-?\d+-[ON]-[A-Z0-9-]+|-?\d{2,6})$/.test(id)) ids.add(id);
  }
  return [...ids].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).map(id => {
    const marker = id.match(/^[A-Z]+-?\d+-([ON])-/)?.[1];
    return { id, stage: parseStageFromWorkerId(id), generation: marker === 'O' ? 'Old' : marker === 'N' ? 'New' : null };
  });
}

/** Resolve a former ID only when the records identify an unambiguous current
 * owner. An exchanged/reassigned ID is itself the current owner's ID. */
export function resolveCollectorHistory(selectedId: string, swaps: IdSwap[], today: string): { currentId: string; map: OwnershipMap; chain: IdSwap[]; ambiguous: boolean } {
  const effective = swaps.filter(s => s.effective_date <= today);
  const selected = selectedId.toUpperCase();
  let currentId = selected;
  let firstMove: IdSwap | undefined;
  const ambiguousResult = () => ({ currentId, map: {}, chain: [], ambiguous: true });
  const order = (a: IdSwap, b: IdSwap) => a.effective_date.localeCompare(b.effective_date) || a.created_at.localeCompare(b.created_at);
  const selectedEvents = effective.filter(s => s.old_worker_id.toUpperCase() === selected || s.new_worker_id.toUpperCase() === selected).sort(order);
  const latestDate = selectedEvents[selectedEvents.length - 1]?.effective_date;
  if (latestDate) {
    const latest = selectedEvents.filter(s => s.effective_date === latestDate);
    const incoming = latest.filter(s => s.new_worker_id.toUpperCase() === selected);
    const outgoing = latest.filter(s => s.old_worker_id.toUpperCase() === selected);
    if (incoming.length > 1 || outgoing.length > 1) return ambiguousResult();
    if (incoming.length && outgoing.length && (!incoming[0].exchange_group || incoming[0].exchange_group !== outgoing[0].exchange_group)) return ambiguousResult();
    // An incoming record means this ID currently belongs to its new holder.
    // Otherwise follow the person who moved away, including through exchanges.
    if (!incoming.length && outgoing.length) firstMove = outgoing[0];
  }
  if (firstMove) {
    let move = firstMove;
    const visited = new Set([move.id]);
    currentId = move.new_worker_id.toUpperCase();
    for (let i = 0; i < 50; i++) {
      const events = effective.filter(s => s.effective_date > move.effective_date && (s.old_worker_id.toUpperCase() === currentId || s.new_worker_id.toUpperCase() === currentId)).sort(order);
      if (!events.length) break;
      const nextDate = events[0].effective_date;
      const next = events.filter(s => s.effective_date === nextDate);
      const incoming = next.filter(s => s.new_worker_id.toUpperCase() === currentId);
      const outgoing = next.filter(s => s.old_worker_id.toUpperCase() === currentId);
      if (incoming.length > 1 || outgoing.length !== 1 || (incoming.length && (!incoming[0].exchange_group || incoming[0].exchange_group !== outgoing[0].exchange_group))) return ambiguousResult();
      move = outgoing[0];
      if (visited.has(move.id)) return ambiguousResult();
      visited.add(move.id);
      currentId = move.new_worker_id.toUpperCase();
      if (i === 49) return ambiguousResult();
    }
  }
  const { map, chain } = computeOwnership(currentId, effective, today);
  if (chain.length >= 50) return ambiguousResult();
  const windows = Object.values(map).flat();
  for (let i = 0; i < windows.length; i++) for (let j = i + 1; j < windows.length; j++) {
    const a = windows[i], b = windows[j];
    if ((!a.to || !b.from || b.from < a.to) && (!b.to || !a.from || a.from < b.to)) return ambiguousResult();
  }
  // Reject competing records rather than arbitrarily assigning a person's pay.
  for (const change of chain) {
    const sameTime = effective.filter(s => s.id !== change.id && s.effective_date === change.effective_date);
    if (sameTime.some(s => s.new_worker_id.toUpperCase() === change.new_worker_id.toUpperCase() || s.old_worker_id.toUpperCase() === change.old_worker_id.toUpperCase())) {
      return { currentId, map: {}, chain: [], ambiguous: true };
    }
  }
  if (firstMove && !chain.some(s => s.id === firstMove.id)) return ambiguousResult();
  return { currentId, map, chain, ambiguous: false };
}

export function localDay(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function ownedOn(map: OwnershipMap, id: string, date: string): boolean {
  return (map[id.toUpperCase()] || []).some(w => (!w.from || date >= w.from) && (!w.to || date < w.to));
}
export function windowIntersectsCycle(map: OwnershipMap, id: string, start: string, end: string): boolean {
  return (map[id.toUpperCase()] || []).some(w => (!w.to || w.to > start) && (!w.from || w.from <= end));
}
