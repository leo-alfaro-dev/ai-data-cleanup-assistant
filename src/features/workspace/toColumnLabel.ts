import type { Column, ColumnKey } from '@/engine/dataset/dataset';
import { isBlank } from '@/engine/values/isBlank';

export function toColumnLabel({
  columns,
  column,
}: {
  columns: readonly Column[];
  column: ColumnKey;
}): string {
  const header = columns[column]?.header ?? '';

  return isBlank(header) ? `Column ${column + 1}` : header.trim();
}
