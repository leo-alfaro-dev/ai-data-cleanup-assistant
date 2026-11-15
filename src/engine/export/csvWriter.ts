export type CsvWriter = {
  toLine(values: readonly string[]): string;
  toText(lines: readonly string[]): string;
};
