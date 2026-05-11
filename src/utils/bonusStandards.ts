/**
 * GH_COLLECTOR BONUS STANDARDS
 * Recovery Rate Color Coding:
 * - Green (≤15%): Target met with top tier bonus (₦1,500)
 * - Light Green (≤35%): Target met with mid-high bonus (₦1,000)
 * - Amber (≤55%): Target met with mid-low bonus (₦500)
 * - Red (>55%): Target not met (₦0)
 */

export interface BonusStandard {
  stage: string;
  tiers: {
    excellent: { threshold: number; bonus: number; recoveryRate: number };
    good: { threshold: number; bonus: number; recoveryRate: number };
    fair: { threshold: number; bonus: number; recoveryRate: number };
    poor: { threshold: number; bonus: number; recoveryRate: number };
  };
}

export const BONUS_STANDARDS: Record<string, BonusStandard> = {
  'T-1': {
    stage: 'T-1',
    tiers: {
      excellent: { threshold: 0.52, bonus: 1500, recoveryRate: 10 },
      good: { threshold: 0.46, bonus: 1000, recoveryRate: 30 },
      fair: { threshold: 0.40, bonus: 500, recoveryRate: 50 },
      poor: { threshold: 0.00, bonus: 0, recoveryRate: 70 },
    },
  },
  'T0': {
    stage: 'T0',
    tiers: {
      excellent: { threshold: 0.24, bonus: 1500, recoveryRate: 10 },
      good: { threshold: 0.20, bonus: 1000, recoveryRate: 30 },
      fair: { threshold: 0.16, bonus: 500, recoveryRate: 50 },
      poor: { threshold: 0.00, bonus: 0, recoveryRate: 70 },
    },
  },
  'S1': {
    stage: 'S1',
    tiers: {
      excellent: { threshold: 0.065, bonus: 1500, recoveryRate: 10 },
      good: { threshold: 0.045, bonus: 1000, recoveryRate: 30 },
      fair: { threshold: 0.025, bonus: 500, recoveryRate: 50 },
      poor: { threshold: 0.00, bonus: 0, recoveryRate: 70 },
    },
  },
  'S2': {
    stage: 'S2',
    tiers: {
      excellent: { threshold: 0.013, bonus: 1500, recoveryRate: 10 },
      good: { threshold: 0.009, bonus: 1000, recoveryRate: 30 },
      fair: { threshold: 0.005, bonus: 500, recoveryRate: 50 },
      poor: { threshold: 0.00, bonus: 0, recoveryRate: 70 },
    },
  },
  'S3': {
    stage: 'S3',
    tiers: {
      excellent: { threshold: 0.004, bonus: 1500, recoveryRate: 10 },
      good: { threshold: 0.003, bonus: 1000, recoveryRate: 30 },
      fair: { threshold: 0.002, bonus: 500, recoveryRate: 50 },
      poor: { threshold: 0.00, bonus: 0, recoveryRate: 70 },
    },
  },
  'S4': {
    stage: 'S4',
    tiers: {
      excellent: { threshold: 0.0008, bonus: 1500, recoveryRate: 10 },
      good: { threshold: 0.0005, bonus: 1000, recoveryRate: 30 },
      fair: { threshold: 0.0002, bonus: 500, recoveryRate: 50 },
      poor: { threshold: 0.00, bonus: 0, recoveryRate: 70 },
    },
  },
};

/**
 * Get the performance tier based on recovery rate
 * Lower recovery rate = better performance
 */
export function getPerformanceTier(recoveryRate?: number): 'excellent' | 'good' | 'fair' | 'poor' {
  if (recoveryRate === undefined || recoveryRate === null || !Number.isFinite(recoveryRate)) {
    return 'poor';
  }

  if (recoveryRate <= 15) return 'excellent';
  if (recoveryRate <= 35) return 'good';
  if (recoveryRate <= 55) return 'fair';
  return 'poor';
}

/**
 * Get the color className for a recovery rate
 * Uses Tailwind colors for different performance tiers
 */
export function getRecoveryRateColor(recoveryRate?: number): string {
  const tier = getPerformanceTier(recoveryRate);

  switch (tier) {
    case 'excellent':
      return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30';
    case 'good':
      return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30';
    case 'fair':
      return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30';
    case 'poor':
      return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30';
  }
}

/**
 * Get text color only for recovery rate (for table cells)
 */
export function getRecoveryRateTextColor(recoveryRate?: number): string {
  const tier = getPerformanceTier(recoveryRate);

  switch (tier) {
    case 'excellent':
      return 'text-emerald-600 dark:text-emerald-400';
    case 'good':
      return 'text-green-600 dark:text-green-400';
    case 'fair':
      return 'text-amber-600 dark:text-amber-400';
    case 'poor':
      return 'text-red-600 dark:text-red-400';
  }
}

/**
 * Get background color only for recovery rate
 */
export function getRecoveryRateBackgroundColor(recoveryRate?: number): string {
  const tier = getPerformanceTier(recoveryRate);

  switch (tier) {
    case 'excellent':
      return 'bg-emerald-50 dark:bg-emerald-950/30';
    case 'good':
      return 'bg-green-50 dark:bg-green-950/30';
    case 'fair':
      return 'bg-amber-50 dark:bg-amber-950/30';
    case 'poor':
      return 'bg-red-50 dark:bg-red-950/30';
  }
}

/**
 * Get the bonus amount for a given stage and recovery rate
 */
export function getBonusAmount(stage: string, recoveryRate?: number): number {
  const standard = BONUS_STANDARDS[stage];
  if (!standard) return 0;

  if (recoveryRate === undefined || recoveryRate === null || !Number.isFinite(recoveryRate)) {
    return standard.tiers.poor.bonus;
  }

  if (recoveryRate / 100 <= standard.tiers.excellent.threshold) {
    return standard.tiers.excellent.bonus;
  }
  if (recoveryRate / 100 <= standard.tiers.good.threshold) {
    return standard.tiers.good.bonus;
  }
  if (recoveryRate / 100 <= standard.tiers.fair.threshold) {
    return standard.tiers.fair.bonus;
  }
  return standard.tiers.poor.bonus;
}

/**
 * Get stage standard info
 */
export function getStageStandard(stage: string): BonusStandard | null {
  return BONUS_STANDARDS[stage] || null;
}
