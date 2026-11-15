import { describe, expect, it } from 'vitest';
import { toRowId } from '@/engine/dataset/toRowId';
import { groupRowsByKey } from './groupRowsByKey';

const rows = [['a'], ['b'], ['a'], ['c'], ['b'], ['a'], ['d']];

const byFirstCell = (row: readonly string[]) => row[0] ?? null;

describe('groupRowsByKey', () => {
  it('groups rows that share a key, in order of first appearance, each group ascending', () => {
    expect(groupRowsByKey({ rows, toKey: byFirstCell })).toEqual([
      [0, 2, 5],
      [1, 4],
    ]);
  });

  it('returns nothing when every key is distinct', () => {
    expect(
      groupRowsByKey({ rows: [['a'], ['b'], ['c']], toKey: byFirstCell })
    ).toEqual([]);
  });

  it('returns nothing for no rows', () => {
    expect(groupRowsByKey({ rows: [], toKey: byFirstCell })).toEqual([]);
  });

  it('skips a row whose key is null', () => {
    const toKey = (row: readonly string[]) =>
      row[0] === 'a' ? null : byFirstCell(row);

    expect(groupRowsByKey({ rows, toKey })).toEqual([[1, 4]]);
  });

  it('looks only at the row ids it is given', () => {
    const rowIds = [toRowId(1), toRowId(2), toRowId(4), toRowId(5)];

    expect(groupRowsByKey({ rows, rowIds, toKey: byFirstCell })).toEqual([
      [1, 4],
      [2, 5],
    ]);
  });
});
