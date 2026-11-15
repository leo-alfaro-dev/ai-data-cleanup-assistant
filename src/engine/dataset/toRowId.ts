import type { RowId } from './dataset';

export function toRowId(index: number): RowId {
  return index as RowId;
}
