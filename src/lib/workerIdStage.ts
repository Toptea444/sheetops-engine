/**
 * Stage detection from worker ID format.
 *
 * New format IDs carry the stage right after the letter prefix, followed by an
 * O/N generation marker:
 *   GHAS1-O-B-05 / GHAS1-N-B-05  → S1 (O = old, N = new)
 *   GHAS2-O-B-05                 → S2
 *   GHAS3-O-B-05                 → S3
 *   GHAS0-O-b-05                 → T0
 *   Ghas-1-O-b-05                → T-1 (hyphenated single digit)
 * The prefix varies (GHAS, NGDS, ...) — only the stage token before the O/N marker matters.
 *
 * Legacy IDs (no O/N marker):
 *   NGDS-1009 → T-1 (hyphen after the prefix)
 *   NGDS0001  → T0  (leading 0)
 *   NGDS1009  → S1  (leading 1)
 */

export type WorkerStage = 'T-1' | 'T0' | 'S1' | 'S2' | 'S3';

const STAGE_BY_TOKEN: Record<string, WorkerStage> = {
  '-1': 'T-1',
  '0': 'T0',
  '1': 'S1',
  '2': 'S2',
  '3': 'S3',
};

/** Canonical stage label for a stage token such as "-1", "0", "2". */
export function stageFromToken(token: string): WorkerStage | null {
  return STAGE_BY_TOKEN[token] ?? null;
}

/** Registry label normalizer: "T-1", "t 1", "T1", "t-1" all compare equal. */
export function normalizeStageToken(stage: string): string {
  return (stage || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function parseStageFromWorkerId(rawId: string): WorkerStage | null {
  const id = (rawId || '').toUpperCase().replace(/\s+/g, '');
  if (!id) return null;

  // New format: <PREFIX><stage>-<O|N>-<rest>  (single-char O/N generation marker)
  const modern = id.match(/^([A-Z]+)(-?\d+)-[ON](?:-.*)?$/);
  if (modern) {
    const mapped = STAGE_BY_TOKEN[modern[2]];
    if (mapped) return mapped;
  }

  // Legacy format with no O/N marker.
  const legacy = id.match(/^([A-Z]+)(-?)(\d+)$/);
  if (legacy) {
    if (legacy[2] === '-') return 'T-1';
    return STAGE_BY_TOKEN[legacy[3][0]] ?? null;
  }
  return null;
}
