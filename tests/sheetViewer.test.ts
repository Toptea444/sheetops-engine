import { describe, expect, test } from 'bun:test';
import { findSheetHighlights, sheetColumnName } from '../src/lib/sheetViewer';

describe('sheet viewer highlighting', () => {
  test('highlights each weekly block separately, not other workers', () => {
    const rows = [['WEEK 1', '', '', '', 'WEEK 2'], ['S1 NEW', '2026-10-12', 'TOTAL', 'AMOUNT', 'S1 NEW', '2026-10-19', 'TOTAL', 'AMOUNT'], ['NGDS1-A-01', '2%', '2%', '5000', 'NGDS1-A-02', '1%', '1%', '0'], ['NGDS1-A-02', '1%', '1%', '0', 'NGDS1-A-01', '3%', '3%', '5000']];
    expect(findSheetHighlights(rows, 'ngds1-a-01')).toEqual([{ row: 2, start: 0, end: 4 }, { row: 3, start: 4, end: 8 }]);
  });
  test('matches exact IDs and stops at next daily block', () => {
    const rows = [['2026-11-10', '', '', '2026-11-11'], ['stage', 'usernames', 'total', 'stage', 'usernames', 'total'], ['', 'NGDS1-A-01', '500', '', 'NGDS1-A-010', '100']];
    expect(findSheetHighlights(rows, 'NGDS1-A-01')).toEqual([{ row: 2, start: 1, end: 3 }]);
  });
  test('formats spreadsheet columns', () => { expect([0, 25, 26, 701, 702].map(sheetColumnName)).toEqual(['A', 'Z', 'AA', 'ZZ', 'AAA']); });
});

describe('stacked blocks', () => {
  test('uses the nearest section header for an old stage below another layout', () => {
    const rows = [
      ['2026-11-10', '', '', '2026-11-11'],
      ['STAGES', 'USERNAMES', 'TOTAL', 'STAGES', 'USERNAMES', 'TOTAL'],
      ['NEW', 'NGDS0-N-A-01', '100', 'NEW', 'NGDS0-N-A-01', '200'],
      [],
      ['2026-11-10', '', '', '', '2026-11-11'],
      ['STAGES', 'USERNAMES', 'BONUS', 'TOTAL', 'STAGES', 'USERNAMES', 'BONUS', 'TOTAL'],
      ['OLD', 'NGDS0-O-A-04', '100', '200', 'OLD', 'NGDS0-O-A-04', '50', '150'],
    ];
    expect(findSheetHighlights(rows, 'ngds0-o-a-04')).toEqual([{ row: 6, start: 1, end: 4 }, { row: 6, start: 5, end: 8 }]);
  });
  test('unknown layout highlights only the ID, not neighbouring cells', () => {
    expect(findSheetHighlights([['NGDS0-O-A-04', 'another cell']], 'NGDS0-O-A-04')).toEqual([{ row: 0, start: 0, end: 1 }]);
  });
});
