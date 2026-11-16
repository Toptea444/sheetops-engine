/** Search enabled tabs for an exact ID, independently of earnings dates or totals.
 * A failed tab means a negative result is inconclusive, not "ID not found". */
export async function findWorkerInTabs(
  tabs: Array<{ name: string; disabled?: boolean }>,
  workerId: string,
  readTab: (name: string) => Promise<unknown[][]>,
): Promise<boolean> {
  const target = workerId.trim().toUpperCase();
  if (!target) return false;
  const enabled = tabs.filter(tab => !tab.disabled);
  if (!enabled.length) throw new Error('No available sheet tabs could be checked. Please try again or contact your admin.');
  let failed = false;
  for (const tab of enabled) {
    try {
      const rows = await readTab(tab.name);
      if (rows.some(row => row.some(cell => String(cell ?? '').trim().toUpperCase() === target))) return true;
    } catch {
      failed = true;
    }
  }
  if (failed) throw new Error('Some sheets could not be checked. Please check your connection and try again.');
  return false;
}
