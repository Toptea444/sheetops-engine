import { getCycleForDate, type CyclePeriod } from './cycleUtils';
import { isDefaultStageSheet } from './stageSheetRegistry';
import { normalizeStageToken, parseStageFromWorkerId } from './workerIdStage';
import type { StageSheet } from './spreadsheetConfig';

/** Only suggest, never switch automatically: titles often omit their year. */
export function cycleSuggestedByTab(name: string, reference = new Date()): { cycle: CyclePeriod; inferredYear: boolean } | null {
  const re = /\b(\d{1,2})(?:st|nd|rd|th)?\s*(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)(?:\.?\s+(\d{4}))?/gi;
  const dates = [...name.matchAll(re)];
  if (dates.length !== 2 || Number(dates[0][1]) !== 16 || Number(dates[1][1]) !== 15) return null;
  const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  const first = months.indexOf(dates[0][2].slice(0,3).toLowerCase());
  const second = months.indexOf(dates[1][2].slice(0,3).toLowerCase());
  if (first < 0 || second !== (first + 1) % 12) return null;
  const startYear = dates[0][3] ? Number(dates[0][3]) : dates[1][3] ? Number(dates[1][3]) - (first === 11 ? 1 : 0) : null;
  if (dates[0][3] && dates[1][3] && Number(dates[1][3]) !== Number(dates[0][3]) + (first === 11 ? 1 : 0)) return null;
  const year = startYear ?? [reference.getFullYear()-1, reference.getFullYear(), reference.getFullYear()+1]
    .sort((a,b) => Math.abs(new Date(a, first, 16).getTime() - reference.getTime()) - Math.abs(new Date(b, first, 16).getTime() - reference.getTime()))[0];
  if (year < 1900 || year > 9998) return null;
  return { cycle: getCycleForDate(new Date(year, first, 16)), inferredYear: startYear === null };
}

export function cycleFromMonthKey(key: string): CyclePeriod | null {
  const match = /^(\d{4})-(\d{2})$/.exec(key);
  if (!match) return null;
  const year = Number(match[1]), month = Number(match[2]);
  if (year < 1900 || year > 9998 || month < 1 || month > 12) return null;
  return getCycleForDate(new Date(year, month - 1, 16));
}

/** Match only enabled, explicitly configured stage sources. */
export function suggestedStageSources(id: string, current: StageSheet | undefined, sources: StageSheet[]): { stage: string; sources: StageSheet[] } | null {
  const stage = parseStageFromWorkerId(id);
  if (!stage || !current || isDefaultStageSheet(current.stage) || normalizeStageToken(current.stage) === normalizeStageToken(stage)) return null;
  const matches = sources.filter(s => s.enabled && !!s.spreadsheetId && !isDefaultStageSheet(s.stage) && s.spreadsheetId !== current.spreadsheetId && normalizeStageToken(s.stage) === normalizeStageToken(stage));
  return { stage, sources: matches };
}
