import { beforeEach, describe, expect, mock, test } from 'bun:test';

let registry: Array<{stage:string; spreadsheetId:string; enabled:boolean}> = [];
let files: Record<string, string[][] | 'fail'> = {};
const fakeClient = {
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({data: {setting_value: registry}, error: null}) }) }) }),
  functions: { invoke: async (_name: string, {body}: {body: {action: string; spreadsheetId: string}}) => {
    const file = files[body.spreadsheetId];
    if (file === 'fail') return {data: null, error: new Error('unavailable')};
    if (body.action === 'getSheets') return {data: {sheets: [{name:'New cycle'}]}, error: null};
    return {data: {headers: file?.[0] ?? [], rows: file?.slice(1) ?? []}, error: null};
  } },
};
mock.module('../src/integrations/supabase/client', () => ({supabase: fakeClient}));
const { findStageSheet, sheetContainsWorker } = await import('../src/lib/stageSheetResolver');
const { SPREADSHEET_ID, getActiveSpreadsheetId, setActiveSpreadsheetId } = await import('../src/lib/spreadsheetConfig');

describe('login stage sheet resolution', () => {
  beforeEach(() => { registry = []; files = {}; setActiveSpreadsheetId(null); });
  test('locates the entered ID on its stage file without activating it', async () => {
    registry = [{stage:'S1',spreadsheetId:'stage-one',enabled:true}, {stage:'S2',spreadsheetId:'stage-two',enabled:true}];
    files = {'stage-one': [['USERNAMES'], ['GHAS1-N-B-05']], 'stage-two': [['USERNAMES']]};
    expect(await findStageSheet('GHAS1-N-B-05')).toBe('stage-one');
    expect(getActiveSpreadsheetId()).toBe(SPREADSHEET_ID);
  });
  test('does not fall back to another file when the configured stage cannot be checked', async () => {
    registry = [{stage:'S1',spreadsheetId:'stage-one',enabled:true}, {stage:'S2',spreadsheetId:'stage-two',enabled:true}];
    files = {'stage-one':'fail', 'stage-two': [['USERNAMES'], ['GHAS1-N-B-05']]};
    expect(findStageSheet('GHAS1-N-B-05')).rejects.toThrow();
  });
  test('honors a disabled default and confirms IDs on the enabled default', async () => {
    registry = [{stage:'__default__',spreadsheetId:'default-entry',enabled:false}];
    expect(await findStageSheet('GHAS1-N-B-05')).toBeNull();
    registry = [];
    files[SPREADSHEET_ID] = [['USERNAMES'], ['GHAS1-N-B-05']];
    expect(await findStageSheet('GHAS1-N-B-05')).toBe(SPREADSHEET_ID);
    expect(await sheetContainsWorker(SPREADSHEET_ID, 'GHAS1-N-B-05')).toBe(true);
  });
});
