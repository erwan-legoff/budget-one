import { Test, TestingModule } from '@nestjs/testing';
import { SpreadsheetMapperService } from './spreadsheet-mapper.service';

describe('SpreadsheetMapperService', () => {
  let service: SpreadsheetMapperService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SpreadsheetMapperService],
    }).compile();

    service = module.get<SpreadsheetMapperService>(SpreadsheetMapperService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
