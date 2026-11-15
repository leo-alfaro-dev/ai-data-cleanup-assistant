import { describe, expect, it } from 'vitest';
import { toColumnKey } from '@/engine/dataset/toColumnKey';
import { toRowId } from '@/engine/dataset/toRowId';
import { connectIdentifierGroups } from './connectIdentifierGroups';
import type { IdentifierGroup } from './identifierGroup';
import { MAX_ROWS_PER_RECORD } from './maxRowsPerRecord';

function group(
  column: number,
  value: string,
  ...rows: number[]
): IdentifierGroup {
  return { column: toColumnKey(column), value, rows: rows.map(toRowId) };
}

describe('connectIdentifierGroups', () => {
  it('gives a group that overlaps no other its own record', () => {
    const only = group(0, 'a', 3, 5);

    expect(connectIdentifierGroups([only])).toEqual([
      { keep: 3, remove: [5], links: [only] },
    ]);
  });

  it('joins overlapping groups, keeping each link with its record, ordered by first row', () => {
    const email = group(0, 'a', 2, 4);
    const phone = group(1, 'b', 4, 7);
    const other = group(0, 'c', 0, 9);

    expect(connectIdentifierGroups([email, phone, other])).toEqual([
      { keep: 0, remove: [9], links: [other] },
      { keep: 2, remove: [4, 7], links: [email, phone] },
    ]);
  });

  it('leaves out a record of more than MAX_ROWS_PER_RECORD rows', () => {
    const rows = Array.from(
      { length: MAX_ROWS_PER_RECORD + 1 },
      (_, index) => index
    );
    const small = group(0, 'x', 50, 51);

    expect(
      connectIdentifierGroups([
        group(0, 'a', ...rows.slice(0, 6)),
        group(1, 'b', ...rows.slice(5)),
        small,
      ])
    ).toEqual([{ keep: 50, remove: [51], links: [small] }]);
  });

  it('gives nothing for no groups', () => {
    expect(connectIdentifierGroups([])).toEqual([]);
  });
});
