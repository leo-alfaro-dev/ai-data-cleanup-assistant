import type { RowId } from '@/engine/dataset/dataset';

/**
 * Pairs each row with the `windowSize` rows that follow it in `rowIds`: at most `windowSize`
 * pairs per row, so the work grows with the number of rows, not with its square.
 */
export function* listNeighborPairs({
  rowIds,
  windowSize,
}: {
  rowIds: readonly RowId[];
  windowSize: number;
}): Generator<readonly [RowId, RowId]> {
  for (let index = 0; index < rowIds.length; index++) {
    const first = rowIds[index];
    if (first === undefined) continue;

    const last = Math.min(index + windowSize, rowIds.length - 1);
    for (let other = index + 1; other <= last; other++) {
      const second = rowIds[other];
      if (second !== undefined) yield [first, second];
    }
  }
}
