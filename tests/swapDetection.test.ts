import { describe, expect, test } from 'bun:test';
import { selectSwapAway } from '../src/lib/swapDetection';

const row = (id: string, old_worker_id: string, new_worker_id: string, exchange_group: string | null = null) => ({
  id, old_worker_id, new_worker_id, effective_date: '2026-11-05', exchange_group,
});

describe('swap detection', () => {
  test('both prior holders have an outgoing notice for one linked exchange', () => {
    const rows = [row('incoming', 'A', 'B', 'pair'), row('outgoing', 'B', 'A', 'pair')];
    expect(selectSwapAway('A', rows)?.new_worker_id).toBe('B');
    expect(selectSwapAway('B', rows)?.new_worker_id).toBe('A');
    expect(selectSwapAway('B', [...rows].reverse())?.new_worker_id).toBe('A');
  });
  test('a later incoming one-way move does not redirect the new holder', () => {
    expect(selectSwapAway('B', [row('latest', 'A', 'B')])).toBeNull();
    expect(selectSwapAway('A', [row('latest', 'A', 'B')])?.new_worker_id).toBe('B');
    expect(selectSwapAway('A', [])).toBeNull();
  });
});
