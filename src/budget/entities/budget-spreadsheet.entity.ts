export class BudgetSpreadsheetRow {
  debit: number;
  credit: number;
  label: string;
  date: Date;
}

export class BudgetSpreadsheet {
  rows: BudgetSpreadsheetRow[];
}
