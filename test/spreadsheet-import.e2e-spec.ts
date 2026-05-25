import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { AppModule } from './../src/app.module';
import { SpreadsheetMapperService } from './../src/spreadsheet-mapper/spreadsheet-mapper.service';
import { SpreadsheetService } from './../src/spreadsheet/spreadsheet.service';

describe('Spreadsheet import flow (e2e)', () => {
  let app: INestApplication;
  let spreadsheetService: SpreadsheetService;
  let spreadsheetMapperService: SpreadsheetMapperService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    spreadsheetService = app.get(SpreadsheetService);
    spreadsheetMapperService = app.get(SpreadsheetMapperService);
  });

  afterEach(async () => {
    await app.close();
  });

  it('imports the provided spreadsheet into budget rows', async () => {
    const spreadsheetBuffer = await readFile(
      join(process.cwd(), 'src/spreadsheet-mapper/CA20260327_212230.xlsx'),
    );

    const importedSpreadsheet = await spreadsheetService.import(
      Buffer.from(spreadsheetBuffer),
    );

    expect(importedSpreadsheet.errors).toEqual([]);
    expect(importedSpreadsheet.valid).toHaveLength(1);

    const mappedBudget = spreadsheetMapperService.import(
      importedSpreadsheet.valid[0],
      new Map([
        ['Date', 'date'],
        ['Libellé', 'label'],
        ['Débit euros', 'debit'],
        ['Crédit euros', 'credit'],
      ]),
    );

    expect(mappedBudget.rows).toHaveLength(16);
    expect(mappedBudget.rows[0]).toMatchObject({
      label:
        'VIREMENT EN VOTRE FAVEUR\nLE GOFF ERWAN \nNORVEGE PERMANENT                  ',
      credit: 10,
    });
    expect(mappedBudget.rows[0]?.date).toBeInstanceOf(Date);
    expect(mappedBudget.rows[0]?.date.toISOString()).toBe(
      '2026-03-03T00:00:00.000Z',
    );
    expect(mappedBudget.rows[1]).toMatchObject({
      debit: 50,
    });
    expect(mappedBudget.rows[15]).toMatchObject({
      credit: 10,
    });
  });
});
