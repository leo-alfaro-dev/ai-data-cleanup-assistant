import type { RowId } from './dataset';

export function toRowNumber(rowId: RowId): number {
  return rowId + FIRST_DATA_ROW_NUMBER;
}

const FIRST_DATA_ROW_NUMBER = 2;
