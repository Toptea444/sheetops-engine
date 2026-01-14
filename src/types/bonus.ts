export interface SheetInfo {
  id: string;
  name: string;
  /** Mirrors Google Sheets hidden/disabled state (when available). */
  disabled?: boolean;
}

export type BonusValueType = 'percent' | 'amount';

export interface WorkerData {
  workerId: string;
  userName: string;
  /** Stage like T-1, S3, etc. */
  stage: string;
  bucket: string;
  dailyData: DailyBonus[];
  /** How to display/interpret values in dailyData (defaults to percent). */
  valueType?: BonusValueType;
}

export interface DailyBonus {
  date: string;
  /** Day number (1-31) for sorting/filtering */
  dayNumber?: number;
  value: number;
}

export interface BonusResult {
  workerId: string;
  userName: string;
  /** Stage like T-1, S3, etc. */
  stage: string;
  bucket: string;
  totalBonus: number;
  dailyBreakdown: DailyBonus[];
  dateRange: {
    start: string;
    end: string;
  };
  /** How to display/interpret totalBonus + dailyBreakdown values (defaults to percent). */
  valueType?: BonusValueType;
}

export interface SheetData {
  headers: string[];
  rows: string[][];
  sheetName: string;
}
