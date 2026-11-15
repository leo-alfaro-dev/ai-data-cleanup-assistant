import { describe, expect, it } from 'vitest';
import { toColumnKey } from '@/engine/dataset/toColumnKey';
import { toRowId } from '@/engine/dataset/toRowId';
import { toDataset } from '@/engine/testing/toDataset';
import { toMergeRows } from './toMergeRows';

function merge(lines: string[], remove: number[]) {
  const { rows } = toDataset('a,b,c', ...lines);

  return toMergeRows({ rows, keep: toRowId(0), remove: remove.map(toRowId) });
}

describe('toMergeRows', () => {
  it('chooses, for each blank cell of the kept row, the first later row that has a value', () => {
    expect(merge([',,z', 'x,,', ',y,w', 'v,u,t'], [1, 2, 3])).toEqual({
      kind: 'mergeRows',
      keep: 0,
      remove: [1, 2, 3],
      values: [
        { column: toColumnKey(0), from: 1 },
        { column: toColumnKey(1), from: 2 },
      ],
    });
  });

  it('never replaces a cell the kept row has', () => {
    expect(merge(['p,q,r', 'x,y,z'], [1]).values).toEqual([]);
  });

  it('treats a whitespace-only cell of the kept row as blank', () => {
    expect(merge(['p,  ,r', 'x,y,z'], [1]).values).toEqual([
      { column: toColumnKey(1), from: 1 },
    ]);
  });

  it('fills a placeholder in the kept row from a later row, so the real value is not lost', () => {
    expect(merge(['N/A,y,-', 'x,N/A,z'], [1]).values).toEqual([
      { column: toColumnKey(0), from: 1 },
      { column: toColumnKey(2), from: 1 },
    ]);
  });

  it('keeps a placeholder in the kept row when no later row has a value for it', () => {
    expect(merge(['N/A,y,z', 'unknown,,'], [1]).values).toEqual([]);
  });

  it('leaves a cell blank when no later row has a value, and copies no placeholder or blank', () => {
    expect(merge([',,', 'N/A, ,-', 'null,,unknown'], [1, 2]).values).toEqual(
      []
    );
  });

  it('reads a ragged short row as blank where it ends', () => {
    expect(merge(['p', 'x,y,z'], [1]).values).toEqual([
      { column: toColumnKey(1), from: 1 },
      { column: toColumnKey(2), from: 1 },
    ]);
  });

  it('gives an empty choice list when nothing is removed', () => {
    expect(merge([',,'], [])).toEqual({
      kind: 'mergeRows',
      keep: 0,
      remove: [],
      values: [],
    });
  });
});
