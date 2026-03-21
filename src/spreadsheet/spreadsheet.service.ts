import { Injectable } from '@nestjs/common';
import {
  Workbook,
  CellValue,
  CellFormulaValue,
  CellHyperlinkValue,
  CellRichTextValue,
  CellSharedFormulaValue,
  RichText,
} from 'exceljs';
import { ImportResult } from './dto/import-result.dto';
import type {
  SpreadsheetCell,
  SpreadsheetFile,
  SpreadsheetFileType,
  SpreadsheetRow,
} from './spreadsheet.interface';
import type { ISpreadsheetService } from './spreadsheet.service.interface';

@Injectable()
export class SpreadsheetService implements ISpreadsheetService<SpreadsheetFile> {
  async import(buffer: Buffer): Promise<ImportResult<SpreadsheetFile>> {
    const type = this.detectFileType(buffer);

    if (type === 'xlsx') {
      return this.importXlsx(buffer);
    }

    return this.importCsv(buffer);
  }

  async export(data: SpreadsheetFile[]): Promise<Buffer> {
    const file: SpreadsheetFile | undefined = data[0];

    if (!file) {
      return Buffer.from('');
    }

    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet(file.sheetName || 'Sheet1');

    worksheet.addRow(file.headers);

    for (const row of file.rows) {
      worksheet.addRow(file.headers.map((header) => row[header] ?? null));
    }

    const buffer = await workbook.csv.writeBuffer();
    return Buffer.from(buffer);
  }

  private async importXlsx(
    buffer: Buffer,
  ): Promise<ImportResult<SpreadsheetFile>> {
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
          type: 'xlsx',
          sheetName: worksheet.name,
          ...this.extractWorksheetContent(worksheet),
        },
      ],
      errors: [],
    };
  }

  private importCsv(buffer: Buffer): Promise<ImportResult<SpreadsheetFile>> {
    const [headerRow = [], ...dataRows] = this.parseCsv(
      buffer.toString('utf-8'),
    );
    const headers = this.buildHeaders(headerRow);
    const rows = dataRows
      .filter((row) => row.some((cell) => cell !== null && cell !== ''))
      .map((row) => this.mapRowToObject(headers, row));

    return Promise.resolve({
      valid: [
        {
          type: 'csv',
          sheetName: 'Sheet1',
          headers,
          rows,
        },
      ],
      errors: [],
    });
  }

  private detectFileType(buffer: Buffer): SpreadsheetFileType {
    const isXlsx = buffer.subarray(0, 2).equals(Buffer.from('PK'));

    return isXlsx ? 'xlsx' : 'csv';
  }

  private extractWorksheetContent(worksheet: WorksheetLike): {
    headers: string[];
    rows: SpreadsheetRow[];
  } {
    const headerRow = this.getRowValues(worksheet, 1);
    const headers = this.buildHeaders(headerRow);
    const rows: SpreadsheetRow[] = [];

    for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex += 1) {
      const row = this.getRowValues(worksheet, rowIndex);

      if (row.some((cell) => this.normalizeCellValue(cell) !== null)) {
        rows.push(this.mapRowToObject(headers, row));
      }
    }

    return { headers, rows };
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

  private buildHeaders(row: Array<CellValue | undefined>): string[] {
    return row.map((cell, index) => {
      const value = this.normalizeCellValue(cell);
      return value === null || value === ''
        ? `column_${index + 1}`
        : String(value).trim();
    });
  }

  private mapRowToObject(
    headers: string[],
    row: Array<CellValue | undefined>,
  ): SpreadsheetRow {
    return headers.reduce<SpreadsheetRow>((accumulator, header, index) => {
      accumulator[header] = this.normalizeCellValue(row[index]);
      return accumulator;
    }, {});
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
