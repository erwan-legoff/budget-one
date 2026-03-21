export class ImportResult<T> {
  valid: T[];
  errors: {
    row: number;
    reason: string;
    raw: unknown;
  }[];
}
