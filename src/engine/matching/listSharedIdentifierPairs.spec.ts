import { describe, expect, it } from 'vitest';
import { toColumnKey } from '@/engine/dataset/toColumnKey';
import { toRowId } from '@/engine/dataset/toRowId';
import { toDataset } from '@/engine/testing/toDataset';
import { listSharedIdentifierPairs } from './listSharedIdentifierPairs';

describe('listSharedIdentifierPairs', () => {
  it('pairs every two rows of a group, lower row id first', () => {
    const { rows } = toDataset(
      'email',
      'a@x.com',
      'b@x.com',
      'a@x.com',
      'A@x.com'
    );

    const pairs = [
      ...listSharedIdentifierPairs({
        rows,
        rowIds: rows.map((_, index) => toRowId(index)),
        identifierColumns: [{ column: toColumnKey(0), isPhone: false }],
      }),
    ];

    expect(pairs).toEqual([
      [0, 2],
      [0, 3],
      [2, 3],
    ]);
  });

  it('gives nothing when no value is shared', () => {
    const { rows } = toDataset('email', 'a@x.com', 'b@x.com');

    expect([
      ...listSharedIdentifierPairs({
        rows,
        rowIds: [toRowId(0), toRowId(1)],
        identifierColumns: [{ column: toColumnKey(0), isPhone: false }],
      }),
    ]).toEqual([]);
  });
});
