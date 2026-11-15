import { describe, expect, it } from 'vitest';
import { toRowId } from '@/engine/dataset/toRowId';
import { listCopyRows } from './listCopyRows';

describe('listCopyRows', () => {
  it('lists every row of each group but the first', () => {
    const groups = [
      [toRowId(0), toRowId(3), toRowId(5)],
      [toRowId(1), toRowId(2)],
    ];

    expect(
      [...listCopyRows(groups)].sort((first, second) => first - second)
    ).toEqual([2, 3, 5]);
  });

  it('lists nothing for no groups or an empty group', () => {
    expect(listCopyRows([]).size).toBe(0);
    expect(listCopyRows([[]]).size).toBe(0);
  });
});
