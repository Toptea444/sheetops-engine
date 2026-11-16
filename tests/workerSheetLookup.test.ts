import { describe, expect, test } from 'bun:test';
import { findWorkerInTabs } from '../src/lib/workerSheetLookup';

describe('login sheet ID lookup', () => {
  test('finds an exact ID in a later tab without dates or earnings', async () => {
    const tabs = [{ name: 'Previous cycle' }, { name: 'New cycle' }];
    const result = await findWorkerInTabs(tabs, ' abcd-001 ', async name =>
      name === 'Previous cycle' ? [['ABCD-002']] : [['USERNAMES'], [' abcd-001 ']]);
    expect(result).toBe(true);
  });
  test('does not accept partial IDs or disabled tabs', async () => {
    expect(await findWorkerInTabs([{ name: 'hidden', disabled: true }, { name: 'visible' }], 'ABCD-001', async name =>
      name === 'hidden' ? [['ABCD-001']] : [['ABCD-0010']])).toBe(false);
  });
  test('a failure does not hide an ID on a later tab', async () => {
    expect(await findWorkerInTabs([{ name: 'failed' }, { name: 'match' }], 'ABCD-001', async name => {
      if (name === 'failed') throw new Error('network');
      return [['ABCD-001']];
    })).toBe(true);
  });
  test('a failure without a match is not reported as not found', async () => {
    expect(findWorkerInTabs([{ name: 'failed' }, { name: 'other' }], 'ABCD-001', async name => {
      if (name === 'failed') throw new Error('network');
      return [['ABCD-002']];
    })).rejects.toThrow('could not be checked');
  });
  test('no enabled tabs is a lookup error', async () => {
    expect(findWorkerInTabs([{ name: 'hidden', disabled: true }], 'ABCD-001', async () => [])).rejects.toThrow('No available sheet tabs');
  });
});
