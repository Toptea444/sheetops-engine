import type { StageSheet } from '@/lib/spreadsheetConfig';
import { normalizeStageToken } from '@/lib/workerIdStage';

export const DEFAULT_SHEET_STAGE_KEY = '__default__';

export function isDefaultStageSheet(stage: string): boolean {
  return normalizeStageToken(stage) === normalizeStageToken(DEFAULT_SHEET_STAGE_KEY);
}

export function isDefaultFallbackEnabled(registry: StageSheet[]): boolean {
  const entry = registry.find((sheet) => isDefaultStageSheet(sheet.stage));
  return entry ? entry.enabled : true;
}

export function getEnabledStageSheets(registry: StageSheet[]): StageSheet[] {
  return registry.filter(
    (sheet) => sheet.enabled && Boolean(sheet.spreadsheetId) && !isDefaultStageSheet(sheet.stage),
  );
}