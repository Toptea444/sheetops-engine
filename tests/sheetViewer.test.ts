import { describe, expect, test } from 'bun:test';
import { findSheetHighlights, findSheetMatches, sheetColumnName } from '../src/lib/sheetViewer';

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


describe('sheet search order and context', () => {
  test('navigates blocks left to right even when the worker changes rows', () => {
    const rows = [
      ['2026-11-10', '', '', '2026-11-11', '', '', '2026-11-12'],
      ['STAGES', 'NAMES', 'TOTAL', 'STAGES', 'NAMES', 'TOTAL', 'STAGES', 'NAMES', 'TOTAL'],
      ['T0', 'other', '0', 'T0', 'NGDS0-O-A-04', '20', 'T0', 'other', '0'],
      ['T0', 'NGDS0-O-A-04', '10', 'T0', 'other', '0', 'T0', 'NGDS0-O-A-04', '30'],
    ];
    const found = findSheetMatches(rows, 'ngds0-o-a-04');
    expect(found.map(m => [m.date, m.total, m.row, m.start, m.end])).toEqual([
      ['2026-11-10', '10', 3, 1, 3], ['2026-11-11', '20', 2, 4, 6], ['2026-11-12', '30', 3, 7, 9],
    ]);
  });
  test('does not treat a stage data cell as a header', () => {
    const rows = [['2026-10-18'], ['STAGES', 'USERNAMES', 'BONUS', 'TOTAL'], ['T0', 'other', '20', '30'], ['T0', 'NGDS0-O-A-04', '40', '50']];
    const [match] = findSheetMatches(rows, 'NGDS0-O-A-04');
    expect([match.date, match.start, match.end, match.total]).toEqual(['2026-10-18', 1, 4, '50']);
  });
});

test('keeps date context when a lower section repeats headings without repeating the date', () => {
  const rows = [['2026-11-10'], ['STAGES', 'USERNAMES', 'TOTAL'], ['NEW', 'another', '5'], [], ['STAGES', 'USERNAMES', 'TOTAL'], ['OLD', 'NGDS0-O-A-04', '25']];
  const [match] = findSheetMatches(rows, 'NGDS0-O-A-04');
  expect([match.date, match.total, match.end]).toEqual(['2026-11-10', '25', 3]);
});

describe('distant date headers and inferred blocks', () => {
  test('finds dates across a long standards section and highlights to total', () => {
    const rows: string[][] = [['Day: 10/16/2026', '', '', '', 'Day: 10/17/2026']];
    for (let i = 0; i < 20; i++) rows.push(['COLLECTOR BONUS STANDARDS']);
    rows.push(['STAGES', 'USER NAMES', 'BONUS', 'TOTAL', 'STAGES', 'USER NAMES', 'BONUS', 'TOTAL']);
    rows.push(['OLD', 'NGDS0-O-A-04', '50', '100', 'OLD', 'NGDS0-O-A-04', '75', '150']);
    expect(findSheetMatches(rows, 'NGDS0-O-A-04').map(m => [m.date, m.start, m.end, m.total])).toEqual([
      ['Day: 10/16/2026', 1, 4, '100'], ['Day: 10/17/2026', 5, 8, '150'],
    ]);
  });
  test('recognises ordinal dates and bounds missing headers by repeated date blocks', () => {
    const rows = [['16THOCT 2026', '', '', '', '17th Oct 2026'], ['x', 'NGDS0-O-A-04', '50', '100', 'x', 'NGDS0-O-A-04', '75', '150']];
    expect(findSheetMatches(rows, 'NGDS0-O-A-04').map(m => [m.date, m.start, m.end])).toEqual([
      ['16THOCT 2026', 1, 4], ['17th Oct 2026', 5, 8],
    ]);
  });
  test('a new date section is not assigned the previous section date', () => {
    const rows = [['10/16/2026', '', '', '10/17/2026'], ['STAGES', 'NAMES', 'TOTAL', 'STAGES', 'NAMES', 'TOTAL'], ['x', 'NGDS1-A-01', '5'], ['10/18/2026', '', '', '10/19/2026'], ['x', 'NGDS1-A-01', '7']];
    expect(findSheetMatches(rows, 'NGDS1-A-01').map(m => m.date)).toEqual(['10/16/2026', '10/18/2026']);
  });
});
