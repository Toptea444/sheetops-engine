import { describe, expect, test } from 'bun:test';
import { cycleSuggestedByTab, cycleFromMonthKey, suggestedStageSources } from '../src/lib/tlContext';
import { getCycleKey } from '../src/lib/cycleUtils';
const reference = new Date(2026, 10, 16);
const sources = [{stage:'S1', spreadsheetId:'s1',enabled:true}, {stage:'T0',spreadsheetId:'t0',enabled:true}, {stage:'T0',spreadsheetId:'disabled',enabled:false}, {stage:'__default__',spreadsheetId:'default',enabled:true}];
describe('TL context suggestions', () => {
  test('suggests the last-cycle range from a tab without forcing a change', () => {
    const result = cycleSuggestedByTab('16th Oct - 15th Nov', reference);
    expect(result && getCycleKey(result.cycle)).toBe('2026-10');
    expect(result?.inferredYear).toBe(true);
  });
  test('handles cross-year ranges and explicit end year', () => {
    const result = cycleSuggestedByTab('16 Dec - 15 Jan 2027',reference);
    expect(result && getCycleKey(result.cycle)).toBe('2026-12');
    expect(result?.inferredYear).toBe(false);
    expect(cycleSuggestedByTab('16 Dec 2026 - 15 Jan 2028',reference)).toBeNull();
  });
  test('does not claim a cycle for unrelated dates or unsupported names', () => {
    expect(cycleSuggestedByTab('WEEK 1',reference)).toBeNull();
    expect(cycleSuggestedByTab('1 Oct - 15 Nov',reference)).toBeNull();
    expect(cycleSuggestedByTab('16 Oct - 15 Nov and 16 Nov - 15 Dec',reference)).toBeNull();
  });
  test('supports explicit cycle start months without changing date ranges', () => {
    expect(getCycleKey(cycleFromMonthKey('2026-10')!)).toBe('2026-10');
    expect(cycleFromMonthKey('2026-13')).toBeNull();
    expect(cycleFromMonthKey('0099-01')).toBeNull();
  });
  test('suggests enabled matching stages but never treats default as a mismatch', () => {
    expect(suggestedStageSources('NGDS0-O-A-04', sources[0], sources)).toEqual({stage:'T0',sources:[sources[1]]});
    expect(suggestedStageSources('NGDS0-O-A-04', sources[3], sources)).toBeNull();
    expect(suggestedStageSources('UNKNOWN', sources[0], sources)).toBeNull();
    expect(suggestedStageSources('NGDS1-N-A-04', sources[0], sources)).toBeNull();
    expect(suggestedStageSources('NGDS2-N-A-04', sources[0], sources)).toEqual({stage:'S2',sources:[]});
  });
});

describe('stage and old/new source labels', () => {
  const s1new = {stage:'S1 New', spreadsheetId:'s1-new', enabled:true};
  const s1old = {stage:'S1 Old', spreadsheetId:'s1-old', enabled:true};
  const t0new = {stage:'T0 New', spreadsheetId:'t0-new', enabled:true};
  const general = {stage:'S1', spreadsheetId:'s1-general', enabled:true};
  const entries = [s1new, s1old, t0new, general];
  test('does not warn for an S1 new ID already on S1 New', () => {
    expect(suggestedStageSources('NGDS1-N-A-19', s1new, entries)).toBeNull();
    expect(suggestedStageSources('NGDS1-N-A-19', {...s1new, stage:'s 1 - NEW'}, entries)).toBeNull();
  });
  test('finds qualified stage labels without proposing the opposite generation', () => {
    expect(suggestedStageSources('NGDS1-N-A-19', t0new, entries)).toEqual({stage:'S1', sources:[s1new, general]});
    expect(suggestedStageSources('NGDS1-O-A-19', t0new, entries)).toEqual({stage:'S1', sources:[s1old, general]});
    expect(suggestedStageSources('NGDS1009', t0new, entries)).toEqual({stage:'S1', sources:[s1new, s1old, general]});
  });
  test('can suggest a matching generation when the stage is right but type differs', () => {
    expect(suggestedStageSources('NGDS1-N-A-19', s1old, entries)).toEqual({stage:'S1 New',sources:[s1new, general]});
    expect(suggestedStageSources('NGDS1-O-A-19', s1new, entries)).toEqual({stage:'S1 Old',sources:[s1old, general]});
    expect(suggestedStageSources('NGDS1009', s1new, entries)).toBeNull();
  });
  test('handles T-1 variations and declines to guess custom labels', () => {
    const old = {stage:'T-1 Old', spreadsheetId:'t1-old',enabled:true};
    expect(suggestedStageSources('NGDS-1-O-A-01', old, [old])).toBeNull();
    expect(suggestedStageSources('NGDS1-N-A-19', {...s1new,stage:'S1 New team east'}, entries)).toBeNull();
    expect(suggestedStageSources('NGDS1-N-A-19', {...s1new,stage:'S10 New'}, entries)).toBeNull();
  });
});
