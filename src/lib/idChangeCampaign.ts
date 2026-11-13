/** First day earnings belong to the new IDs in the November 2026 rollout. */
export const ID_CHANGE_EFFECTIVE_DATE = '2026-11-10';

export const campaignResponseKey = (workerId: string) => `performanceTracker_idChangeNov2026_${workerId.trim().toUpperCase()}`;
export const campaignDeferredKey = (workerId: string) => `performanceTracker_idChangeNov2026_deferred_${workerId.trim().toUpperCase()}`;
export const campaignIntentKey = (workerId: string) => `performanceTracker_idChangeNov2026_intent_${workerId.trim().toUpperCase()}`;

export function shouldPromptForIdChange(response: string | null, deferred: string | null): boolean {
  return response !== 'no' && response !== 'complete' && deferred !== 'true';
}
