import { describe, expect, it } from 'vitest';
import { toRowId } from '@/engine/dataset/toRowId';
import { listNameNeighborPairs } from './listNameNeighborPairs';

function idsOf(count: number) {
  return Array.from({ length: count }, (_, index) => toRowId(index));
}

function pairsOf({
  rowIds,
  nameKeys,
  windowSize = 1,
}: {
  rowIds: ReturnType<typeof idsOf>;
  nameKeys: readonly (readonly string[])[];
  windowSize?: number;
}) {
  return [...listNameNeighborPairs({ rowIds, nameKeys, windowSize })];
}

describe('listNameNeighborPairs', () => {
  it('sorts by the one name column and pairs neighbors, lower row id first', () => {
    const pairs = pairsOf({
      rowIds: idsOf(4),
      nameKeys: [['d', 'a', 'c', 'b']],
    });

    expect(pairs).toEqual([
      [1, 3],
      [2, 3],
      [0, 2],
    ]);
  });

  it('makes a second pass with the columns reversed when there are two', () => {
    const first = ['ann', 'bob', 'ann', 'bob'];
    const last = ['lee', 'lee', 'kim', 'kim'];

    const pairs = pairsOf({ rowIds: idsOf(4), nameKeys: [first, last] });

    // First, last order is rows 2, 0, 3, 1; last, first order is rows 2, 3, 0, 1.
    expect(pairs).toEqual([
      [0, 2],
      [0, 3],
      [1, 3],
      [2, 3],
      [0, 3],
      [0, 1],
    ]);
  });

  it('lets the second pass pair rows whose first names differ at the first character', () => {
    const first = ['ana', 'bob', 'cy', 'dana'];
    const last = ['lee', 'tan', 'poe', 'lee'];
    const rowIds = idsOf(4);

    const onlyFirstColumn = pairsOf({ rowIds, nameKeys: [first] });
    const bothColumns = pairsOf({ rowIds, nameKeys: [first, last] });

    expect(onlyFirstColumn).not.toContainEqual([0, 3]);
    expect(bothColumns).toContainEqual([0, 3]);
  });

  it('leaves out rows with a blank name key', () => {
    const pairs = pairsOf({
      rowIds: idsOf(4),
      nameKeys: [
        ['a', '', 'b', 'c'],
        ['x', 'y', 'z', ''],
      ],
      windowSize: 5,
    });

    expect(new Set(pairs.flat())).toEqual(new Set([0, 2]));
  });

  it('looks only at the row ids it is given', () => {
    const pairs = pairsOf({
      rowIds: [toRowId(0), toRowId(2)],
      nameKeys: [['a', 'a', 'a']],
      windowSize: 5,
    });

    expect(pairs).toEqual([[0, 2]]);
  });

  it('breaks ties between equal keys by row id so the order is stable', () => {
    const pairs = pairsOf({
      rowIds: idsOf(3),
      nameKeys: [['same', 'same', 'same']],
    });

    expect(pairs).toEqual([
      [0, 1],
      [1, 2],
    ]);
  });

  it('gives nothing with no name column', () => {
    expect(pairsOf({ rowIds: idsOf(3), nameKeys: [] })).toEqual([]);
  });
});
