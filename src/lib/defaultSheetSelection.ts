import { parseStageFromWorkerId } from './workerIdStage';

/** The copied October tab should not contribute to T0 collectors' earnings. */
export function isExcludedT0Copy(sheetName: string, workerId: string | null | undefined): boolean {
  const normalizedName = sheetName.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return normalizedName === 'COPYOFOCT1631ST' && parseStageFromWorkerId(workerId || '') === 'T0';
}
