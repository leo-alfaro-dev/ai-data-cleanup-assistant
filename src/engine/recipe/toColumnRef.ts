import type { Column, ColumnKey } from '@/engine/dataset/dataset';
import type { ColumnRef } from './recipe';

export function toColumnRef({
  columns,
  key,
}: {
  columns: readonly Column[];
  key: ColumnKey;
}): ColumnRef | null {
  const column = columns.find((candidate) => candidate.key === key);
  if (!column) return null;

  const occurrence = columns
    .filter((candidate) => candidate.header === column.header)
    .findIndex((candidate) => candidate.key === key);

  return { header: column.header, occurrence: occurrence + 1 };
}
