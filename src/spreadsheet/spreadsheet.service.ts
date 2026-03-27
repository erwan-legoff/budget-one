import { Injectable } from '@nestjs/common';
import {
  CellFormulaValue,
  CellHyperlinkValue,
  CellRichTextValue,
  CellSharedFormulaValue,
  CellValue,
  RichText,
  Workbook,
} from 'exceljs';
import { ImportResult } from './dto/import-result.dto';
import type {
  Spreadsheet,
  SpreadsheetCell,
  SpreadsheetRow,
} from './spreadsheet.interface';
import type { ISpreadsheetService } from './spreadsheet.service.interface';

@Injectable()
export class SpreadsheetService implements ISpreadsheetService<Spreadsheet> {
  async import(buffer: Buffer): Promise<ImportResult<Spreadsheet>> {
    const type = this.detectFileType(buffer);

    if (type === 'xlsx') {
      return this.importXlsx(buffer);
    }

    return this.importCsv(buffer);
  }

  async export(data: Spreadsheet[]): Promise<Buffer> {
    const file: Spreadsheet | undefined = data[0];

    if (!file) {
      return Buffer.from('');
    }

    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet(file.sheetName || 'Sheet1');

    for (const row of file.rows) {
      worksheet.addRow(row);
    }

    const buffer = await workbook.csv.writeBuffer();
    return Buffer.from(buffer);
  }

  private async importXlsx(buffer: Buffer): Promise<ImportResult<Spreadsheet>> {
    const workbook = new Workbook();
    await workbook.xlsx.load(
      buffer as unknown as Parameters<Workbook['xlsx']['load']>[0],
    );

    const worksheet = workbook.worksheets[0];

    if (!worksheet) {
      return {
        valid: [],
        errors: [
          {
            row: 0,
            reason: 'The provided file does not contain any worksheet.',
            raw: null,
          },
        ],
      };
    }

    return {
      valid: [
        {
          sheetName: worksheet.name,
          ...this.extractWorksheetContent(worksheet),
        },
      ],
      errors: [],
    };
  }

  private importCsv(buffer: Buffer): Promise<ImportResult<Spreadsheet>> {
    const rows = this.parseCsv(buffer.toString('utf-8')).filter((row) =>
      row.some((cell) => cell !== null && cell !== ''),
    );

    return Promise.resolve({
      valid: [
        {
          sheetName: 'Sheet1',
          rows,
        },
      ],
      errors: [],
    });
  }

  private detectFileType(buffer: Buffer): 'csv' | 'xlsx' {
    const isXlsx = buffer.subarray(0, 2).equals(Buffer.from('PK'));

    return isXlsx ? 'xlsx' : 'csv';
  }

  private extractWorksheetContent(worksheet: WorksheetLike): {
    rows: SpreadsheetRow[];
  } {
    const rows: SpreadsheetRow[] = [];

    for (let rowIndex = 1; rowIndex <= worksheet.rowCount; rowIndex += 1) {
      const row = this.getRowValues(worksheet, rowIndex).map((cell) =>
        this.normalizeCellValue(cell),
      );

      if (row.some((cell) => cell !== null)) {
        rows.push(row);
      }
    }

    return { rows };
  }

  private getRowValues(
    worksheet: WorksheetLike,
    rowNumber: number,
  ): Array<CellValue | undefined> {
    const row = worksheet.getRow(rowNumber);
    const values = Array.isArray(row.values)
      ? row.values
      : Object.values(row.values);
    return values.slice(1);
  }

  private parseCsv(content: string): string[][] {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentCell = '';
    let insideQuotes = false;

    for (let index = 0; index < content.length; index += 1) {
      const char = content[index];
      const nextChar = content[index + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          currentCell += '"';
          index += 1;
        } else {
          insideQuotes = !insideQuotes;
        }

        continue;
      }

      if (char === ',' && !insideQuotes) {
        currentRow.push(currentCell);
        currentCell = '';
        continue;
      }

      if ((char === '\n' || char === '\r') && !insideQuotes) {
        if (char === '\r' && nextChar === '\n') {
          index += 1;
        }

        currentRow.push(currentCell);
        rows.push(currentRow);
        currentRow = [];
        currentCell = '';
        continue;
      }

      currentCell += char;
    }

    if (currentCell !== '' || currentRow.length > 0) {
      currentRow.push(currentCell);
      rows.push(currentRow);
    }

    return rows.filter((row) => row.length > 1 || row[0] !== '');
  }

  private normalizeCellValue(value: CellValue | undefined): SpreadsheetCell {
    if (value === undefined || value === null) {
      return null;
    }

    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      value instanceof Date
    ) {
      return value;
    }

    if (this.isHyperlinkValue(value)) {
      return value.text;
    }

    if (this.isFormulaValue(value)) {
      return this.normalizeCellValue(value.result);
    }

    if (this.isRichTextValue(value)) {
      return value.richText.map((item) => item.text).join('');
    }

    return JSON.stringify(value);
  }

  private isHyperlinkValue(value: CellValue): value is CellHyperlinkValue {
    return typeof value === 'object' && value !== null && 'hyperlink' in value;
  }

  private isFormulaValue(
    value: CellValue,
  ): value is CellFormulaValue | CellSharedFormulaValue {
    return typeof value === 'object' && value !== null && 'result' in value;
  }

  private isRichTextValue(value: CellValue): value is CellRichTextValue {
    return (
      typeof value === 'object' &&
      value !== null &&
      'richText' in value &&
      Array.isArray(value.richText) &&
      value.richText.every(this.isRichTextItem)
    );
  }

  private isRichTextItem(this: void, value: unknown): value is RichText {
    return (
      typeof value === 'object' &&
      value !== null &&
      'text' in value &&
      typeof value.text === 'string'
    );
  }
}

interface WorksheetLike {
  name: string;
  rowCount: number;
  getRow(rowNumber: number): {
    values:
      | Array<CellValue | undefined>
      | Record<string, CellValue | undefined>;
  };
}
