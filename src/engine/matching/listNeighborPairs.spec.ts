import { describe, expect, it } from 'vitest';
import { toRowId } from '@/engine/dataset/toRowId';
import { listNeighborPairs } from './listNeighborPairs';

function idsOf(count: number) {
  return Array.from({ length: count }, (_, index) => toRowId(index));
}

describe('listNeighborPairs', () => {
  it('pairs each row with the next rows up to the window', () => {
    const pairs = [...listNeighborPairs({ rowIds: idsOf(5), windowSize: 2 })];

    expect(pairs).toEqual([
      [0, 1],
      [0, 2],
      [1, 2],
      [1, 3],
      [2, 3],
      [2, 4],
      [3, 4],
    ]);
  });

  it('pairs a short list with everything after each row', () => {
    const pairs = [...listNeighborPairs({ rowIds: idsOf(3), windowSize: 5 })];

    expect(pairs).toEqual([
      [0, 1],
      [0, 2],
      [1, 2],
    ]);
  });

  it('keeps the order it is given, not row id order', () => {
    const rowIds = [toRowId(9), toRowId(2), toRowId(5)];

    expect([...listNeighborPairs({ rowIds, windowSize: 1 })]).toEqual([
      [9, 2],
      [2, 5],
    ]);
  });

  it('gives nothing for no rows, one row or no window', () => {
    expect([...listNeighborPairs({ rowIds: [], windowSize: 5 })]).toEqual([]);
    expect([...listNeighborPairs({ rowIds: idsOf(1), windowSize: 5 })]).toEqual(
      []
    );
    expect([...listNeighborPairs({ rowIds: idsOf(4), windowSize: 0 })]).toEqual(
      []
    );
  });

  it('makes at most rows times window pairs for 100,000 rows', () => {
    const rowCount = 100_000;
    const windowSize = 5;
    const count = [
      ...listNeighborPairs({ rowIds: idsOf(rowCount), windowSize }),
    ].length;

    expect(count).toBeLessThanOrEqual(rowCount * windowSize);
    expect(count).toBe(
      rowCount * windowSize - (windowSize * (windowSize + 1)) / 2
    );
  });
});
