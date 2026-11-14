import type { SourceFormat } from './dataset';

export type FileFacts = {
  fileName: string;
  rowCount: number;
  columnCount: number;
  format: SourceFormat;
};
