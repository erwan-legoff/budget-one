import { ImportResult } from './dto/import-result.dto';

export interface ISpreadsheetService<T> {
  import(buffer: Buffer): Promise<ImportResult<T>>;
  export(data: T[]): Promise<Buffer>;
}
