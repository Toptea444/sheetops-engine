import { describe, expect, test } from 'bun:test';
import { computeOwnership, type IdSwap } from '../src/lib/swapOwnership';

const row = (id: string, oldId: string, newId: string, date: string, group: string | null = null): IdSwap => ({
  id, worker_name: oldId, old_worker_id: oldId, new_worker_id: newId,
  effective_date: date, cycle_key: 'cycle', notes: null, created_at: `${date}T12:00:00Z`, exchange_group: group,
});

describe('ID ownership', () => {
  test('splits a move into exclusive date windows', () => {
    expect(computeOwnership('NEW', [row('one', 'OLD', 'NEW', '2026-11-05')], '2026-11-12').map).toEqual({
      NEW: [{ from: '2026-11-05', to: null }], OLD: [{ from: null, to: '2026-11-05' }],
    });
  });
  test('both sides of an exchange follow only their own pre-swap history', () => {
    const records = [row('a', 'A', 'B', '2026-11-05', 'pair'), row('b', 'B', 'A', '2026-11-05', 'pair')];
    expect(computeOwnership('B', records, '2026-11-12').map).toEqual({ B: [{ from: '2026-11-05', to: null }], A: [{ from: null, to: '2026-11-05' }] });
    expect(computeOwnership('A', records, '2026-11-12').map).toEqual({ A: [{ from: '2026-11-05', to: null }], B: [{ from: null, to: '2026-11-05' }] });
  });
  test('walks through prior moves but ignores future changes', () => {
    const records = [row('a', 'X', 'A', '2026-10-01'), row('b', 'A', 'B', '2026-11-05', 'pair'), row('c', 'B', 'A', '2026-11-05', 'pair'), row('future', 'B', 'C', '2026-12-01')];
    expect(computeOwnership('B', records, '2026-11-12').map).toEqual({ B: [{ from: '2026-11-05', to: null }], A: [{ from: '2026-10-01', to: '2026-11-05' }], X: [{ from: null, to: '2026-10-01' }] });
  });
});
