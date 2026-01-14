export interface SheetInfo {
  id: string;
  name: string;
}

export interface WorkerData {
  workerId: string;
  userName: string;
  bucket: string;
  dailyData: DailyBonus[];
}

export interface DailyBonus {
  date: string;
  value: number;
}

export interface BonusResult {
  workerId: string;
  userName: string;
  bucket: string;
  totalBonus: number;
  dailyBreakdown: DailyBonus[];
  dateRange: {
    start: string;
    end: string;
  };
}

export interface SheetData {
  headers: string[];
  rows: string[][];
  sheetName: string;
}
