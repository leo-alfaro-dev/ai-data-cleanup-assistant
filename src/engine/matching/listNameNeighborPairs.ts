import type { RowId } from '@/engine/dataset/dataset';
import { listNeighborPairs } from './listNeighborPairs';

/**
 * Sorts the rows that have every name by the name keys and pairs each with its neighbors, once
 * with the columns in order and once reversed, so a typo in the first column does not hide a
 * pair. Each pair has the lower row id first.
 */
export function* listNameNeighborPairs({
  rowIds,
  nameKeys,
  windowSize,
}: {
  rowIds: readonly RowId[];
  nameKeys: readonly (readonly string[])[];
  windowSize: number;
}): Generator<readonly [RowId, RowId]> {
  if (nameKeys.length === 0) return;

  const named = rowIds.filter((rowId) =>
    nameKeys.every((keys) => (keys[rowId] ?? '') !== '')
  );
  const orders =
    nameKeys.length === 1 ? [nameKeys] : [nameKeys, [...nameKeys].reverse()];

  for (const order of orders) {
    const sorted = [...named].sort((first, second) =>
      compareByKeys({ order, first, second })
    );

    for (const [first, second] of listNeighborPairs({
      rowIds: sorted,
      windowSize,
    })) {
      yield first < second ? [first, second] : [second, first];
    }
  }
}

function compareByKeys({
  order,
  first,
  second,
}: {
  order: readonly (readonly string[])[];
  first: RowId;
  second: RowId;
}): number {
  for (const keys of order) {
    const firstKey = keys[first] ?? '';
    const secondKey = keys[second] ?? '';
    if (firstKey !== secondKey) return firstKey < secondKey ? -1 : 1;
  }

  return first - second;
}
