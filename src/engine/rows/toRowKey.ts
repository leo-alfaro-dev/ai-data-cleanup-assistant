import type { Row } from '@/engine/dataset/dataset';

/**
 * One string for a row's cells. Each cell is prefixed by its length, so no choice of
 * cell contents can make two different rows produce the same key.
 */
export function toRowKey({
  row,
  toCellKey = (cell) => cell,
}: {
  row: Row;
  toCellKey?: (cell: string) => string;
}): string {
  let key = '';

  for (const cell of row) {
    const cellKey = toCellKey(cell);
    key += `${cellKey.length}:${cellKey}`;
  }

  return key;
}
