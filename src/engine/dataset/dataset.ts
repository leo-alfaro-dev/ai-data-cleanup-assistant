import type { Brand } from '@/lib/brand';

export type RowId = Brand<number, 'RowId'>;

export type ColumnKey = Brand<number, 'ColumnKey'>;

export type Column = {
  key: ColumnKey;
  header: string;
};

export type Row = readonly string[];

export type Dataset = {
  columns: readonly Column[];
  rows: readonly Row[];
  format: SourceFormat;
  structure: StructureNotes;
};

export type SourceFormat = {
  delimiter: Delimiter;
  lineBreak: LineBreak;
  hasByteOrderMark: boolean;
  encoding: TextEncoding;
};

export const DELIMITERS = [',', ';', '\t', '|'] as const;

export type Delimiter = (typeof DELIMITERS)[number];

export const LINE_BREAKS = ['\r\n', '\n', '\r'] as const;

export type LineBreak = (typeof LINE_BREAKS)[number];

export type TextEncoding = 'utf-8' | 'windows-1252';

export type StructureNotes = {
  headerCellCount: number;
  raggedRows: readonly RaggedRow[];
  blankLinesSkipped: number;
};

export type RaggedRow = {
  rowId: RowId;
  cellCount: number;
};
