import { BudgetSpreadsheet } from 'src/budget/entities/budget-spreadsheet.entity';
import { Spreadsheet } from 'src/spreadsheet/spreadsheet.interface';

export interface ISpreadsheetMapperService {
  import(spreadSheet: Spreadsheet): BudgetSpreadsheet;
}
