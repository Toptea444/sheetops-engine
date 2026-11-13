/** Same ID format accepted by the collector login; normalize before calling. */
export function isValidWorkerId(id: string): boolean {
  return /^[A-Z]{4}[A-Z0-9-]{1,20}$/.test(id);
}
