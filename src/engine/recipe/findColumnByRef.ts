import type { Column, ColumnKey } from '@/engine/dataset/dataset';
import type { ColumnRef } from './recipe';

export function findColumnByRef({
  columns,
  ref,
}: {
  columns: readonly Column[];
  ref: ColumnRef;
}): ColumnKey | null {
  const sameHeader = columns.filter(({ header }) => header === ref.header);

  return sameHeader[ref.occurrence - 1]?.key ?? null;
}
