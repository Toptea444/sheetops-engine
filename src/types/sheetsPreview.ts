export interface ParsedSheetLink {
  spreadsheetId: string;
  gid: number | null;
}

export interface MergeRange {
  startRowIndex?: number;
  endRowIndex?: number;
  startColumnIndex?: number;
  endColumnIndex?: number;
}

export interface PreviewSheet {
  id: number;
  name: string;
  hidden: boolean;
  sheetType: string;
  rowCount: number;
  columnCount: number;
  frozenRowCount: number;
  frozenColumnCount: number;
  merges: MergeRange[];
  values: string[][];
}

export interface SpreadsheetPreviewResponse {
  spreadsheetTitle: string;
  sheets: PreviewSheet[];
}
