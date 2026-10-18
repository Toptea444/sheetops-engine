import { describe, expect, test } from 'bun:test';
import { getSpreadsheetCycleCacheKey } from '../src/lib/spreadsheetConfig';

describe('spreadsheet-scoped cycle cache keys', () => {
  test('does not treat an old spreadsheet cache as data from the current source', () => {
    expect(getSpreadsheetCycleCacheKey('2026-09', 'old-sheet-id')).toBe('2026-09::old-sheet-id');
    expect(getSpreadsheetCycleCacheKey('2026-09', 'new-sheet-id')).toBe('2026-09::new-sheet-id');
    expect(getSpreadsheetCycleCacheKey('2026-09', 'old-sheet-id')).not.toBe(
      getSpreadsheetCycleCacheKey('2026-09', 'new-sheet-id'),
    );
  });
});