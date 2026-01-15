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
  /** Full date timestamp (ms since epoch) for date range validation */
  fullDate?: number;
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
  /** Actual date range from sheet data (may differ from requested range) */
  actualDateRange?: {
    start: string;
    end: string;
  };
  /** Warning message when dates were adjusted */
  dateWarning?: string;
  /** How to display/interpret totalBonus + dailyBreakdown values (defaults to percent). */
  valueType?: BonusValueType;
}

export interface SheetData {
  headers: string[];
  rows: string[][];
  sheetName: string;
}
