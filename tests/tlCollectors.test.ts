import { describe, expect, test } from 'bun:test';
import { listCollectors, resolveCollectorHistory, ownedOn, windowIntersectsCycle } from '../src/lib/tlCollectors';
import type { IdSwap } from '../src/lib/swapOwnership';
const swap = (id: string, old: string, next: string, date: string, group: string | null = null): IdSwap => ({ id, old_worker_id: old, new_worker_id: next, effective_date: date, exchange_group: group, worker_name:'', cycle_key:'', notes:null, created_at:`${date}T12:00:00Z` });

describe('TL collector directory', () => {
  test('deduplicates supported IDs across blocks, with stages and explicit ID types', () => {
    const result = listCollectors({sheetName:'test',headers:['USERNAMES', 'GHAS1-O-A-05'], rows:[['ghas1-o-a-05','NGDS0-N-B-01','NGDS-1009','GHAS9-N-B-05'],['TOTAL', '10/11/2026', 'S1 NEW']]});
    expect(result).toHaveLength(4);
    expect(result.find(x => x.id === 'GHAS1-O-A-05')).toEqual({id:'GHAS1-O-A-05', stage:'S1',generation:'Old'});
    expect(result.find(x => x.id === 'NGDS0-N-B-01')?.generation).toBe('New');
    expect(result.find(x => x.id === 'NGDS-1009')?.generation).toBeNull();
    expect(result.find(x => x.id === 'GHAS9-N-B-05')?.stage).toBeNull();
  });
  test('former and current IDs lead to the same current person after a one-way change', () => {
    const rows = [swap('1','A','B','2026-11-10')];
    for (const id of ['A','B']) {
      const history = resolveCollectorHistory(id,rows,'2026-11-11');
      expect(history.currentId).toBe('B');
      expect(history.ambiguous).toBe(false);
      expect(ownedOn(history.map,'A','2026-11-09')).toBe(true);
      expect(ownedOn(history.map,'A','2026-11-10')).toBe(false);
      expect(ownedOn(history.map,'B','2026-11-10')).toBe(true);
      expect(windowIntersectsCycle(history.map, 'A','2026-10-16','2026-11-15')).toBe(true);
      expect(windowIntersectsCycle(history.map, 'A','2026-11-16','2026-12-15')).toBe(false);
    }
  });
  test('exchanged and reassigned IDs resolve to the current holder, not a previous holder', () => {
    const rows = [swap('1','A','B','2026-11-10','pair'),swap('2','B','A','2026-11-10','pair')];
    const a = resolveCollectorHistory('A',rows,'2026-11-11');
    expect(a.currentId).toBe('A');
    expect(ownedOn(a.map,'B','2026-11-09')).toBe(true);
    expect(ownedOn(a.map,'A','2026-11-09')).toBe(false);
    expect(ownedOn(a.map,'A','2026-11-10')).toBe(true);
  });
  test('follows multiple changes but ignores future changes', () => {
    const rows = [swap('1','A','B','2026-10-20'),swap('2','B','C','2026-11-10'),swap('3','C','D','2026-12-01')];
    const result = resolveCollectorHistory('A', rows, '2026-11-15');
    expect(result.currentId).toBe('C');
    expect(result.chain.length).toBe(2);
    expect(ownedOn(result.map,'B','2026-11-09')).toBe(true);
  });
  test('a former ID follows its holder through a later two-person exchange', () => {
    const rows = [swap('1','A','B','2026-10-20'), swap('2','B','C','2026-11-10','pair'), swap('3','C','B','2026-11-10','pair')];
    const result = resolveCollectorHistory('A', rows, '2026-11-15');
    expect(result.currentId).toBe('C');
    expect(result.ambiguous).toBe(false);
    expect(ownedOn(result.map, 'A','2026-10-19')).toBe(true);
    expect(ownedOn(result.map, 'B','2026-11-09')).toBe(true);
    expect(ownedOn(result.map, 'C','2026-11-10')).toBe(true);
    expect(resolveCollectorHistory('B', rows, '2026-11-15').currentId).toBe('B');
  });
  test('conflicting changes do not yield a combined result', () => {
    const rows = [swap('1','A','B','2026-11-10'),swap('2','A','C','2026-11-10')];
    expect(resolveCollectorHistory('A', rows, '2026-11-11').ambiguous).toBe(true);
    expect(resolveCollectorHistory('B', rows, '2026-11-11').ambiguous).toBe(true);
  });
});
