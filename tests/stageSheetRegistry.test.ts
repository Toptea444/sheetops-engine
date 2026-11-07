import { describe, expect, test } from 'bun:test';
import {
  getEnabledStageSheets,
  isDefaultFallbackEnabled,
  isDefaultStageSheet,
} from '../src/lib/stageSheetRegistry';
import type { StageSheet } from '../src/lib/spreadsheetConfig';

const registry: StageSheet[] = [
  { stage: '__default__', label: 'Default', spreadsheetId: 'main-sheet-id-1234567890', enabled: false },
  { stage: 'S2', spreadsheetId: 'stage-two-sheet-id-123456', enabled: true },
  { stage: 'S1', spreadsheetId: 'disabled-stage-sheet-12345', enabled: false },
];

describe('stage sheet registry fallback rules', () => {
  test('a disabled default entry remains disabled after stage normalization', () => {
    expect(isDefaultStageSheet('__default__')).toBe(true);
    expect(isDefaultFallbackEnabled(registry)).toBe(false);
  });

  test('the default spreadsheet is never treated as a stage discovery candidate', () => {
    expect(getEnabledStageSheets(registry).map((sheet) => sheet.stage)).toEqual(['S2']);
  });
});