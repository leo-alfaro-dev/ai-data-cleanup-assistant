import type { ColumnKey, RowId } from '@/engine/dataset/dataset';

export type ChangedCell = {
  rowId: RowId;
  column: ColumnKey;
  before: string;
  after: string;
};
