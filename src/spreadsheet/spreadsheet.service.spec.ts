import { Test, TestingModule } from '@nestjs/testing';
import { Workbook } from 'exceljs';
import { SpreadsheetService } from './spreadsheet.service';

describe('SpreadsheetService', () => {
  let service: SpreadsheetService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SpreadsheetService],
    }).compile();

    service = module.get<SpreadsheetService>(SpreadsheetService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should import a csv file into a structured object', async () => {
    const buffer = Buffer.from('name,amount\nAlice,42\nBob,18');

    const result = await service.import(buffer);
    const importedFile = result.valid[0];

    expect(result.errors).toEqual([]);
    expect(importedFile).toBeDefined();
    expect(importedFile?.type).toBe('csv');
    expect(typeof importedFile?.sheetName).toBe('string');
    expect(importedFile?.headers).toEqual(['name', 'amount']);
    expect(importedFile?.rows).toEqual([
      { name: 'Alice', amount: '42' },
      { name: 'Bob', amount: '18' },
    ]);
  });

  it('should import only the first worksheet from an excel file', async () => {
    const workbook = new Workbook();
    const firstSheet = workbook.addWorksheet('Clients');
    const secondSheet = workbook.addWorksheet('Ignored');

    firstSheet.addRow(['name', 'amount']);
    firstSheet.addRow(['Alice', 42]);
    secondSheet.addRow(['name']);
    secondSheet.addRow(['Bob']);

    const fileBuffer = await workbook.xlsx.writeBuffer();
    const result = await service.import(Buffer.from(fileBuffer));

    expect(result.errors).toEqual([]);
    expect(result.valid).toEqual([
      {
        type: 'xlsx',
        sheetName: 'Clients',
        headers: ['name', 'amount'],
        rows: [{ name: 'Alice', amount: 42 }],
      },
    ]);
  });
});
