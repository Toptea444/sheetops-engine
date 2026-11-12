import { parseStageFromWorkerId } from './workerIdStage';

/** The copied October tab should not contribute to T0 collectors' earnings. */
export function isExcludedT0Copy(sheetName: string, workerId: string | null | undefined): boolean {
  const normalizedName = sheetName.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return normalizedName === 'COPYOF16THOCT15THNOV' && parseStageFromWorkerId(workerId || '') === 'T0';
}
