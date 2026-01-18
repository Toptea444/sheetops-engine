/**
 * Cycle utilities for 16th-to-15th monthly billing periods
 * Example: Jan 16 - Feb 15, Feb 16 - Mar 15, etc.
 */

export interface CyclePeriod {
  startDate: Date;
  endDate: Date;
  label: string;
  shortLabel: string;
}

/**
 * Generate a unique key for a cycle (for storing cycle-specific data)
 */
export function getCycleKey(cycle: CyclePeriod): string {
  const startMonth = cycle.startDate.getMonth() + 1;
  const startYear = cycle.startDate.getFullYear();
  return `${startYear}-${String(startMonth).padStart(2, '0')}`;
}

/**
 * Get the cycle period for a given date
 * If date is 1st-15th, cycle is previous month 16th to current month 15th
 * If date is 16th-31st, cycle is current month 16th to next month 15th
 */
export function getCycleForDate(date: Date): CyclePeriod {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  let startDate: Date;
  let endDate: Date;

  if (day >= 16) {
    // Current cycle: this month 16th to next month 15th
    startDate = new Date(year, month, 16);
    endDate = new Date(year, month + 1, 15);
  } else {
    // Current cycle: previous month 16th to this month 15th
    startDate = new Date(year, month - 1, 16);
    endDate = new Date(year, month, 15);
  }

  return {
    startDate,
    endDate,
    label: formatCycleLabel(startDate, endDate),
    shortLabel: formatCycleShortLabel(startDate, endDate),
  };
}

/**
 * Get the current cycle based on today's date
 */
export function getCurrentCycle(): CyclePeriod {
  return getCycleForDate(new Date());
}

/**
 * Get previous N cycles from a reference date
 */
export function getPreviousCycles(n: number, referenceDate: Date = new Date()): CyclePeriod[] {
  const cycles: CyclePeriod[] = [];
  let current = getCycleForDate(referenceDate);
  
  for (let i = 0; i < n; i++) {
    // Go to the day before the current cycle's start to get the previous cycle
    const prevDate = new Date(current.startDate);
    prevDate.setDate(prevDate.getDate() - 1);
    current = getCycleForDate(prevDate);
    cycles.push(current);
  }
  
  return cycles;
}

/**
 * Get a list of cycles including current and N previous
 */
export function getCycleOptions(previousCount: number = 5): CyclePeriod[] {
  const current = getCurrentCycle();
  const previous = getPreviousCycles(previousCount);
  return [current, ...previous];
}

/**
 * Check if a date falls within a cycle period
 */
export function isDateInCycle(date: Date, cycle: CyclePeriod): boolean {
  const time = date.getTime();
  const startTime = new Date(cycle.startDate.getFullYear(), cycle.startDate.getMonth(), cycle.startDate.getDate()).getTime();
  const endTime = new Date(cycle.endDate.getFullYear(), cycle.endDate.getMonth(), cycle.endDate.getDate(), 23, 59, 59).getTime();
  return time >= startTime && time <= endTime;
}

/**
 * Format cycle label like "Jan 16 - Feb 15, 2026"
 */
function formatCycleLabel(startDate: Date, endDate: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const startMonth = months[startDate.getMonth()];
  const endMonth = months[endDate.getMonth()];
  const startDay = startDate.getDate();
  const endDay = endDate.getDate();
  const year = endDate.getFullYear();
  
  if (startDate.getFullYear() !== endDate.getFullYear()) {
    return `${startMonth} ${startDay}, ${startDate.getFullYear()} - ${endMonth} ${endDay}, ${year}`;
  }
  
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
}

/**
 * Format short cycle label like "Jan-Feb 2026"
 */
function formatCycleShortLabel(startDate: Date, endDate: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const startMonth = months[startDate.getMonth()];
  const endMonth = months[endDate.getMonth()];
  const year = endDate.getFullYear();
  
  if (startMonth === endMonth) {
    return `${startMonth} ${year}`;
  }
  
  return `${startMonth}-${endMonth} ${year}`;
}

/**
 * Get days remaining in cycle from a reference date
 */
export function getDaysRemainingInCycle(cycle: CyclePeriod, referenceDate: Date = new Date()): number {
  const endTime = cycle.endDate.getTime();
  const refTime = referenceDate.getTime();
  
  if (refTime > endTime) return 0;
  
  const diffMs = endTime - refTime;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Get days elapsed in cycle from start to reference date
 */
export function getDaysElapsedInCycle(cycle: CyclePeriod, referenceDate: Date = new Date()): number {
  const startTime = cycle.startDate.getTime();
  const refTime = Math.min(referenceDate.getTime(), cycle.endDate.getTime());
  
  if (refTime < startTime) return 0;
  
  const diffMs = refTime - startTime;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Get total days in a cycle (always ~30-31 days)
 */
export function getTotalDaysInCycle(cycle: CyclePeriod): number {
  const diffMs = cycle.endDate.getTime() - cycle.startDate.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
}
