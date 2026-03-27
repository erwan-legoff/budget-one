export type SpreadsheetCell = string | number | boolean | Date | null;

export type SpreadsheetRow = SpreadsheetCell[];

export interface Spreadsheet {
  sheetName: string;
  rows: SpreadsheetRow[];
}
