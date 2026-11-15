import type { ColumnKey } from './dataset';

export function toColumnKey(index: number): ColumnKey {
  return index as ColumnKey;
}
