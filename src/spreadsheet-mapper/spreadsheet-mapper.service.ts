import { Injectable } from '@nestjs/common';
import { isValid, parse, parseISO } from 'date-fns';
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
  /**
   * Used to map the spreadsheet into a usable normalized budget object
   * @param spreadSheet the data we want to import
   * @param headerMapping the label used in the doc map to the corresponding budget value
   * @returns a normalized Budget object
   */
  import(
    spreadSheet: Spreadsheet,
    headerMapping: Map<string, BudgetEnum>,
  ): BudgetSpreadsheet {
    const rows = spreadSheet.rows;
    const headersIndex = this.findHeadersRowNumber(rows, [
      ...headerMapping.keys(),
    ]);

    // Can't do anything if no headers are found
    if (!Number.isFinite(headersIndex)) {
      console.error('No Headers found');
      throw new Error('No Headers found');
    }

    const extractedHeaders = rows[headersIndex].map(
      (cell) => cell?.toString() || '',
    );
    const headersIndexMapping = this.extractHeaderToIndexMapping(
      headerMapping,
      extractedHeaders,
    );
    const dataRows = rows.slice(headersIndex + 1);
    const budgetRows: BudgetSpreadsheetRow[] = [];
    for (const dataRow of dataRows) {
      const budgetRow: Partial<BudgetSpreadsheetRow> = {};
      for (const header of headersIndexMapping.keys()) {
        // ignore undefined header
        const index = headersIndexMapping.get(header);
        if (index == null) continue;
        // ignore null value
        const currentCell = dataRow[index];
        if (currentCell == null) continue;

        this.mapDataToField(header, currentCell, budgetRow);
      }
      budgetRows.push(budgetRow as BudgetSpreadsheetRow);
    }
    return { rows: budgetRows };
  }
  /**
   * This is the central mapping method : it will map the cell to its budget param we work on and verify the value is ok
   * @param header the haders that tell us wgere to put the data
   * @param currentCell the data we want to map
   * @param budgetTargetRow the row where we want to store the data
   */
  private mapDataToField(
    header: BudgetEnum,
    currentCell: string | number | boolean | Date,
    budgetTargetRow: Partial<BudgetSpreadsheetRow>,
  ) {
    switch (header) {
      case 'label':
        if (typeof currentCell !== 'string') {
          throw new Error(`${header} must be a string`);
        }
        budgetTargetRow[header] = currentCell;
        break;
      case 'debit':
      case 'credit':
        if (typeof currentCell !== 'number') {
          throw new Error(`${header} must be a number`);
        }
        budgetTargetRow[header] = currentCell;
        break;
      case 'date':
        budgetTargetRow[header] = this.parseDateCell(currentCell, header);
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
  /**
   * Used to know the corresponding index for each header to do mapping header -> index
   *
   * @param headerMapping the mapping between doc label and their corresponding budget value
   * @param extractedHeaders the headers line we found
   * @returns the index of each budget value
   */
  private extractHeaderToIndexMapping(
    headerMapping: Map<string, BudgetEnum>,
    extractedHeaders: string[],
  ): Map<BudgetEnum, number> {
    const headerToIndexMapping: Map<BudgetEnum, number> = new Map();

    for (const headerKey of headerMapping.keys()) {
      // the key must exists in the current header
      const headerIndex = extractedHeaders.findIndex(
        (header) => header === headerKey,
      );
      if (headerIndex === -1) throw new Error(`${headerKey} header not found`);
      // the key must have an associated header enum
      const currentHeaderEnum = headerMapping.get(headerKey);
      if (!currentHeaderEnum) throw new Error('Uncompatible header detected');

      headerToIndexMapping.set(currentHeaderEnum, headerIndex);
    }
    return headerToIndexMapping;
  }
  /**
   * Used to find the line where we have all headers
   *
   * Travel the whole rows until it founds a header row and return it
   * @param rows the rows of our sheet
   * @param headers the headers used for reference
   * @returns the row number where we detect headers
   */
  private findHeadersRowNumber(
    rows: SpreadsheetRow[],
    headers: string[],
  ): number {
    let rowIndex = 0;
    let headersIndex = Infinity;

    while (!Number.isFinite(headersIndex) && rowIndex < rows.length) {
      const oneHeaderValueFoundInCurrentLine = headers.includes(
        rows[rowIndex][0]?.toString() || '',
      );

      if (oneHeaderValueFoundInCurrentLine) {
        // We convert to string for simplicity
        const potentialHeaders = rows[rowIndex].map(
          (cell) => cell?.toString() || '',
        );
        // We filter only header values to check if there's all data
        const filteredHeaders = potentialHeaders.filter((header) =>
          headers.includes(header),
        );
        if (filteredHeaders.length === headers.length) {
          headersIndex = rowIndex;
        }
      }
      rowIndex++;
    }
    return headersIndex;
  }
}
