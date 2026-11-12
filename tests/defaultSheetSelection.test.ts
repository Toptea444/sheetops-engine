import { describe, expect, test } from 'bun:test';
import { isExcludedT0Copy } from '../src/lib/defaultSheetSelection';

describe('T0 copied October sheet exclusion', () => {
  test('excludes the named copy for modern and legacy T0 IDs', () => {
    expect(isExcludedT0Copy('Copy of 16th Oct - 15th Nov', 'GHAS0-N-A-05')).toBe(true);
    expect(isExcludedT0Copy('copy of 16TH oct - 15TH nov', 'NGDS0001')).toBe(true);
  });

  test('does not exclude other stages, unknown IDs, or other tabs', () => {
    expect(isExcludedT0Copy('Copy of 16th Oct - 15th Nov', 'GHAS1-N-A-05')).toBe(false);
    expect(isExcludedT0Copy('Copy of 16th Oct - 15th Nov', 'GHAS-1-O-B-05')).toBe(false);
    expect(isExcludedT0Copy('Copy of 16th Oct - 15th Nov', null)).toBe(false);
    expect(isExcludedT0Copy('16th Oct - 15th Nov', 'GHAS0-N-A-05')).toBe(false);
    expect(isExcludedT0Copy('Copy of 16th Oct - 15th Nov 2', 'GHAS0-N-A-05')).toBe(false);
    expect(isExcludedT0Copy('Copy of Oct 16 - 31st', 'GHAS0-N-A-05')).toBe(false);
  });
});
