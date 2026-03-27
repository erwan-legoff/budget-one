import { Injectable } from '@nestjs/common';
import { ISpreadsheetMapperService } from './spreadsheet-mapper.interface';
import { BudgetSpreadsheet } from 'src/budget/entities/budget-spreadsheet.entity';
import { Spreadsheet } from 'src/spreadsheet/spreadsheet.interface';

@Injectable()
export class SpreadsheetMapperService implements ISpreadsheetMapperService {
  import(spreadSheet: Spreadsheet, headers: string[]): BudgetSpreadsheet {
    const headersIndex = this.findHeadersIndex(spreadSheet, headers);

    if (isNaN(headersIndex)) {
      console.error('No Headers found');
      throw new Error('No Headers found');
    }
  }

  private findHeadersIndex(
    spreadSheet: Spreadsheet,

    headers: string[],
  ) {
    const rows = spreadSheet.rows;
    let rowIndex = 0;
    let headersIndex = Infinity;
    while (isNaN(headersIndex) && rowIndex < headers.length - 1) {
      if (headers.includes(rows[rowIndex][0]?.toString() || '')) {
        const potentialHeaders = rows[rowIndex].map(
          (cell) => cell?.toString() || '',
        );
        const filteredHeaders = potentialHeaders.filter((header) =>
          headers.includes(header),
        );
        if ((filteredHeaders.length = headers.length)) {
          headersIndex = rowIndex;
        }
      }
      rowIndex++;
    }
    return headersIndex;
  }
}
