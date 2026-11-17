import { beforeEach, describe, expect, mock, test } from 'bun:test';

let registry: Array<{stage:string; spreadsheetId:string; enabled:boolean}> = [];
let files: Record<string, string[][] | 'fail'> = {};
let calls: Array<{action: string; spreadsheetId: string}> = [];
const fakeClient = {
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({data: {setting_value: registry}, error: null}) }) }) }),
  functions: { invoke: async (_name: string, {body}: {body: {action: string; spreadsheetId: string}}) => {
    calls.push(body);
    const file = files[body.spreadsheetId];
    if (file === 'fail') return {data: null, error: new Error('unavailable')};
    if (body.action === 'getSheets') return {data: {sheets: [{name:'Previous cycle'}]}, error: null};
    return {data: {headers: file?.[0] ?? [], rows: file?.slice(1) ?? []}, error: null};
  } },
};
mock.module('../src/integrations/supabase/client', () => ({supabase: fakeClient}));
const { findStageSheet, sheetContainsWorker, validateWorkerOnSheets } = await import('../src/lib/stageSheetResolver');
const { SPREADSHEET_ID, getActiveSpreadsheetId, setActiveSpreadsheetId } = await import('../src/lib/spreadsheetConfig');

describe('login stage sheet resolution', () => {
  beforeEach(() => { registry = []; files = {}; calls = []; setActiveSpreadsheetId(null); });
  test('locates the entered ID on its stage file without activating it', async () => {
    registry = [{stage:'S1',spreadsheetId:'stage-one',enabled:true}, {stage:'S2',spreadsheetId:'stage-two',enabled:true}];
    files = {'stage-one': [['USERNAMES'], ['GHAS1-N-B-05']], 'stage-two': [['USERNAMES']]};
    expect(await findStageSheet('GHAS1-N-B-05')).toBe('stage-one');
    expect(getActiveSpreadsheetId()).toBe(SPREADSHEET_ID);
  });
  test('does not fall back to another file when the configured stage cannot be checked', async () => {
    registry = [{stage:'S1',spreadsheetId:'stage-one',enabled:true}, {stage:'S2',spreadsheetId:'stage-two',enabled:true}];
    files = {'stage-one':'fail', 'stage-two': [['USERNAMES'], ['GHAS1-N-B-05']]};
    await expect(findStageSheet('GHAS1-N-B-05')).rejects.toThrow();
  });
  test('honors a disabled default and confirms IDs on the enabled default', async () => {
    registry = [{stage:'__default__',spreadsheetId:'default-entry',enabled:false}];
    expect(await findStageSheet('GHAS1-N-B-05')).toBeNull();
    registry = [];
    files[SPREADSHEET_ID] = [['USERNAMES'], ['GHAS1-N-B-05']];
    expect(await findStageSheet('GHAS1-N-B-05')).toBe(SPREADSHEET_ID);
    expect(await sheetContainsWorker(SPREADSHEET_ID, 'GHAS1-N-B-05')).toBe(true);
  });
  test('validates an ID present on a previous-cycle tab even without any dated earnings', async () => {
    registry = [{stage:'S1 New',spreadsheetId:'stage-new',enabled:true}];
    files = {'stage-new': [['Heading'], ['Standards table'], ['GHAS1-N-B-05']]};
    setActiveSpreadsheetId('current-source', 'OLD-ID');
    expect(await validateWorkerOnSheets('GHAS1-N-B-05')).toBe(true);
    expect(getActiveSpreadsheetId()).toBe('current-source');
  });
  test('prefers new stage file over other stage and unqualified file when an ID is duplicated', async () => {
    registry = [{stage:'S2',spreadsheetId:'other',enabled:true}, {stage:'S1',spreadsheetId:'general',enabled:true}, {stage:'S1 New',spreadsheetId:'stage-new',enabled:true}, {stage:'S1 Old',spreadsheetId:'stage-old',enabled:true}];
    files = {'other': [['GHAS1-N-B-05']], 'general': [['GHAS1-N-B-05']], 'stage-new': [['GHAS1-N-B-05']], 'stage-old': [['GHAS1-N-B-05']]};
    expect(await findStageSheet('GHAS1-N-B-05')).toBe('stage-new');
  });
  test('does not fall through from an unavailable S1 New file to another stage or default', async () => {
    registry = [{stage:'S1 New',spreadsheetId:'stage-new',enabled:true}, {stage:'S2',spreadsheetId:'other',enabled:true}];
    files = {'stage-new':'fail', 'other': [['GHAS1-N-B-05']]};
    await expect(validateWorkerOnSheets('GHAS1-N-B-05')).rejects.toThrow();
  });
  test('can find a new ID in the same old-labelled file if no new-stage source exists', async () => {
    registry = [{stage:'S1 Old',spreadsheetId:'stage-old',enabled:true}];
    files = {'stage-old': [['GHAS1-N-B-05']]};
    expect(await validateWorkerOnSheets('GHAS1-N-B-05')).toBe(true);
  });
  test('does not validate an absent ID or use the disabled default', async () => {
    registry = [{stage:'__default__',spreadsheetId:'default-entry',enabled:false}, {stage:'S1 New',spreadsheetId:'stage-new',enabled:true}];
    files = {'stage-new': [['OTHER-ID']], [SPREADSHEET_ID]: [['GHAS1-N-B-05']]};
    expect(await validateWorkerOnSheets('GHAS1-N-B-05')).toBe(false);
  });

  test('blocks a lower-priority match when a same-priority stage source is unreadable', async () => {
    registry = [{stage:'S1 New',spreadsheetId:'a',enabled:true}, {stage:'S1-New',spreadsheetId:'b',enabled:true}, {stage:'S1',spreadsheetId:'general',enabled:true}];
    files = {'a': [['GHAS1-N-B-05']], 'b':'fail', 'general': [['GHAS1-N-B-05']]};
    await expect(validateWorkerOnSheets('GHAS1-N-B-05')).rejects.toThrow();
  });
  test('supports a stage transition when the labelled stage was checked successfully', async () => {
    registry = [{stage:'S1 New',spreadsheetId:'stage-one',enabled:true}, {stage:'S2',spreadsheetId:'stage-two',enabled:true}];
    files = {'stage-one': [['OTHER']], 'stage-two': [['GHAS1-N-B-05']]};
    expect(await findStageSheet('GHAS1-N-B-05')).toBe('stage-two');
  });
  test('checks the enabled default for presence and distinguishes an unreadable default', async () => {
    files[SPREADSHEET_ID] = [['OTHER']];
    expect(await validateWorkerOnSheets('GHAS1-N-B-05')).toBe(false);
    files[SPREADSHEET_ID] = [['GHAS1-N-B-05']];
    expect(await validateWorkerOnSheets('GHAS1-N-B-05')).toBe(true);
    files[SPREADSHEET_ID] = 'fail';
    await expect(validateWorkerOnSheets('GHAS1-N-B-05')).rejects.toThrow();
  });
  test('does not reread a matched stage source during validation', async () => {
    registry = [{stage:'S1 New',spreadsheetId:'stage-new',enabled:true}];
    files = {'stage-new': [['GHAS1-N-B-05']]};
    expect(await validateWorkerOnSheets('GHAS1-N-B-05')).toBe(true);
    expect(calls.filter(call => call.action === 'getSheetData' && call.spreadsheetId === 'stage-new')).toHaveLength(1);
  });

  test('recognizes normalized stage separators when enforcing the failure safeguard', async () => {
    registry = [{stage:'S-1',spreadsheetId:'stage-one',enabled:true}, {stage:'S2',spreadsheetId:'stage-two',enabled:true}];
    files = {'stage-one':'fail', 'stage-two': [['GHAS1-N-B-05']]};
    await expect(validateWorkerOnSheets('GHAS1-N-B-05')).rejects.toThrow();
  });

});
