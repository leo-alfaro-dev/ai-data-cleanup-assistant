import type { ColumnKey, RowId } from '@/engine/dataset/dataset';

export type IdentifierGroup = {
  column: ColumnKey;
  value: string;
  rows: readonly RowId[];
};
