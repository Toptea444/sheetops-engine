import { describe, expect, test } from 'bun:test';
import { normalizeStageToken, parseStageFromWorkerId } from '../src/lib/workerIdStage';

describe('stage detection from worker ID format', () => {
  test('new-format IDs: stage token before the O/N marker decides the stage', () => {
    expect(parseStageFromWorkerId('Ghas-1-O-b-05')).toBe('T-1');
    expect(parseStageFromWorkerId('GHAS-1-N-A-05')).toBe('T-1');
    expect(parseStageFromWorkerId('GHAS0-O-b-05')).toBe('T0');
    expect(parseStageFromWorkerId('GHAS0-N-A-05')).toBe('T0');
    expect(parseStageFromWorkerId('GHAS1-O-B-05')).toBe('S1');
    expect(parseStageFromWorkerId('GHAS1-N- B-05')).toBe('S1');
    expect(parseStageFromWorkerId('ghas1-o-b-05')).toBe('S1');
    expect(parseStageFromWorkerId('GHAS2-O-B-05')).toBe('S2');
    expect(parseStageFromWorkerId('GHAS3-O-B-05')).toBe('S3');
    expect(parseStageFromWorkerId('NGDS1-O-A-05')).toBe('S1');
    expect(parseStageFromWorkerId('NGDS-1-O-A-05')).toBe('T-1');
  });

  test('legacy IDs without an O/N marker keep the old rules', () => {
    expect(parseStageFromWorkerId('NGDS-1009')).toBe('T-1');
    expect(parseStageFromWorkerId('NGDS0001')).toBe('T0');
    expect(parseStageFromWorkerId('NGDS1009')).toBe('S1');
  });

  test('unrecognisable IDs return null so discovery still searches every sheet', () => {
    expect(parseStageFromWorkerId('')).toBeNull();
    expect(parseStageFromWorkerId('SOMEWEIRD')).toBeNull();
    expect(parseStageFromWorkerId('GHAS9-O-B-05')).toBeNull();
  });

  test('registry stage labels compare equal regardless of hyphens or case', () => {
    expect(normalizeStageToken('T-1')).toBe(normalizeStageToken('t 1'));
    expect(normalizeStageToken('S1')).toBe('S1');
    expect(normalizeStageToken('T0')).toBe('T0');
  });
});
