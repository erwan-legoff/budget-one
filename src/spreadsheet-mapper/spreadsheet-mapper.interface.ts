import { Budget } from 'src/budget/entities/budget';
import {
  BudgetSpreadsheet,
  BudgetSpreadsheetRow,
} from 'src/budget/entities/budget-spreadsheet.entity';
import { Spreadsheet } from 'src/spreadsheet/spreadsheet.interface';
export type BudgetEnum = keyof BudgetSpreadsheetRow;
export interface ISpreadsheetMapperService {
  import(
    spreadSheet: Spreadsheet,
    headersMapping: Map<string, BudgetEnum>,
  ): BudgetSpreadsheet;
}
