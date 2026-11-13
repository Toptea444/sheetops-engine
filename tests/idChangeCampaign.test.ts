import { describe, expect, test } from 'bun:test';
import { ID_CHANGE_EFFECTIVE_DATE, campaignResponseKey, campaignDeferredKey, campaignIntentKey, shouldPromptForIdChange } from '../src/lib/idChangeCampaign';
import { isValidWorkerId } from '../supabase/functions/_shared/workerId';
import { computeOwnership, type IdSwap } from '../src/lib/swapOwnership';

describe('November worker ID change', () => {
  test('uses per-worker responses and defers only for the session', () => {
    expect(campaignResponseKey(' ghas0-n-a-01 ')).toBe(campaignResponseKey('GHAS0-N-A-01'));
    expect(campaignResponseKey('GHAS0-N-A-01')).not.toBe(campaignResponseKey('NGDS0-N-A-01'));
    expect(campaignDeferredKey('id')).not.toBe(campaignIntentKey('id'));
    expect(shouldPromptForIdChange(null, null)).toBe(true);
    expect(shouldPromptForIdChange(null, 'true')).toBe(false);
    expect(shouldPromptForIdChange('no', null)).toBe(false);
    expect(shouldPromptForIdChange('complete', null)).toBe(false);
  });
  test('accepts supported mixed prefixes and rejects invalid IDs', () => {
    expect(isValidWorkerId('NGDS0-N-A-04')).toBe(true);
    expect(isValidWorkerId('GHAS0-N-A-04')).toBe(true);
    expect(isValidWorkerId('GHAS-1009')).toBe(true);
    expect(isValidWorkerId('NGDS')).toBe(false);
    expect(isValidWorkerId('NGDS0 N A 04')).toBe(false);
  });
  test('the tenth is the first day attributed to the new ID', () => {
    const swap: IdSwap = { id: 's', worker_name: 'OLD', old_worker_id: 'OLD', new_worker_id: 'NEW', effective_date: ID_CHANGE_EFFECTIVE_DATE, cycle_key: 'cycle', notes: null, created_at: '2026-11-10T12:00:00Z' };
    const { map } = computeOwnership('NEW', [swap], '2026-11-12');
    expect(map.OLD).toEqual([{ from: null, to: '2026-11-10' }]);
    expect(map.NEW).toEqual([{ from: '2026-11-10', to: null }]);
  });
});
