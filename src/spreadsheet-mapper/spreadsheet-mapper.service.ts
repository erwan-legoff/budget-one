import { Injectable } from '@nestjs/common';
import { isValid, parse, parseISO } from 'date-fns';
import { Budget } from 'src/budget/entities/budget';
import {
  BudgetSpreadsheet,
  BudgetSpreadsheetRow,
} from 'src/budget/entities/budget-spreadsheet.entity';
import {
  Spreadsheet,
  SpreadsheetRow,
} from 'src/spreadsheet/spreadsheet.interface';
import {
  BudgetEnum,
  ISpreadsheetMapperService,
} from './spreadsheet-mapper.interface';

@Injectable()
export class SpreadsheetMapperService implements ISpreadsheetMapperService {
  import(
    spreadSheet: Spreadsheet,
    headerMapping: Map<string, BudgetEnum>,
  ): BudgetSpreadsheet {
    const rows = spreadSheet.rows;
    const headersIndex = this.findHeadersIndex(rows, [...headerMapping.keys()]);

    if (isNaN(headersIndex)) {
      console.error('No Headers found');
      throw new Error('No Headers found');
    }
    const trimedRows = rows.slice(headersIndex, rows.length - 1);
    const extractedHeaders = trimedRows[0].map(
      (cell) => cell?.toString() || '',
    );
    const headersIndexMapping = this.extractIndexMapping(
      headerMapping,
      extractedHeaders,
    );
    const dataRows = rows.slice(1, rows.length - 1);
    const budgetRows: BudgetSpreadsheetRow[] = [];
    for (const dataRow of dataRows) {
      const budgetRow: Partial<BudgetSpreadsheetRow> = {};
      for (const header of headersIndexMapping.keys()) {
        const index = headersIndexMapping.get(header);
        if (index == null) throw new Error(`${header} not found`);
        const currentCell = dataRow[index];
        if (currentCell == null) continue;
        this.mapDataToField(header, currentCell, budgetRow);
      }
      budgetRows.push(budgetRow as BudgetSpreadsheetRow);
    }
    return { rows: budgetRows };
  }

  private mapDataToField(
    header: string,
    currentCell: string | number | boolean | Date,
    budgetRow: Partial<BudgetSpreadsheetRow>,
  ) {
    switch (header) {
      case 'label':
        if (typeof currentCell !== 'string') {
          throw new Error(`${header} must be a string`);
        }
        budgetRow[header] = currentCell;
        break;
      case 'debit':
      case 'credit':
        if (typeof currentCell !== 'number') {
          throw new Error(`${header} must be a number`);
        }
        budgetRow[header] = currentCell;
        break;
      case 'date':
        budgetRow[header] = this.parseDateCell(currentCell, header);
        break;
    }
  }

  private parseDateCell(
    currentCell: string | number | boolean | Date,
    header: string,
  ): Date {
    if (currentCell instanceof Date) {
      return currentCell;
    }

    if (typeof currentCell !== 'string') {
      throw new Error(`${header} must be a Date`);
    }

    const parsedIso = parseISO(currentCell);
    if (isValid(parsedIso)) {
      return parsedIso;
    }

    const parsedCustom = parse(currentCell, 'dd/MM/yyyy', new Date());
    if (isValid(parsedCustom)) {
      return parsedCustom;
    }

    throw new Error(`${header} must be a Date`);
  }

  private extractIndexMapping(
    headerMapping: Map<string, keyof Budget>,
    extractedHeaders: string[],
  ): Map<keyof Budget, number> {
    const headersIndexMapping: Map<keyof Budget, number> = new Map();
    for (const key of headerMapping.keys()) {
      const index = extractedHeaders.findIndex((header) => header == key);
      const currentEnum = headerMapping.get(key);
      if (!currentEnum) throw new Error('Uncompatibl header detected');
      headersIndexMapping.set(currentEnum, index);
    }
    return headersIndexMapping;
  }

  private findHeadersIndex(rows: SpreadsheetRow[], headers: string[]) {
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
