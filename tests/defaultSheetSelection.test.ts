import { describe, expect, test } from 'bun:test';
import { isExcludedT0Copy } from '../src/lib/defaultSheetSelection';

describe('T0 copied October sheet exclusion', () => {
  test('excludes the named copy for modern and legacy T0 IDs', () => {
    expect(isExcludedT0Copy('Copy of Oct 16 - 31st', 'GHAS0-N-A-05')).toBe(true);
    expect(isExcludedT0Copy('copy of oct 16 - 31ST', 'NGDS0001')).toBe(true);
  });

  test('does not exclude other stages, unknown IDs, or other tabs', () => {
    expect(isExcludedT0Copy('Copy of Oct 16 - 31st', 'GHAS1-N-A-05')).toBe(false);
    expect(isExcludedT0Copy('Copy of Oct 16 - 31st', 'GHAS-1-O-B-05')).toBe(false);
    expect(isExcludedT0Copy('Copy of Oct 16 - 31st', null)).toBe(false);
    expect(isExcludedT0Copy('Oct 16 - 31st', 'GHAS0-N-A-05')).toBe(false);
    expect(isExcludedT0Copy('Copy of Oct 16 - 31st 2', 'GHAS0-N-A-05')).toBe(false);
  });
});
