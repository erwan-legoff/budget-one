export type SpreadsheetCell = string | number | boolean | Date | null;

export type SpreadsheetFileType = 'csv' | 'xlsx';

export type SpreadsheetRow = Record<string, SpreadsheetCell>;

export interface SpreadsheetFile {
  type: SpreadsheetFileType;
  sheetName: string;
  headers: string[];
  rows: SpreadsheetRow[];
}
