import type { Column, SourceFormat } from './dataset';

export type FileFacts = {
  fileName: string;
  rowCount: number;
  columns: readonly Column[];
  format: SourceFormat;
};
