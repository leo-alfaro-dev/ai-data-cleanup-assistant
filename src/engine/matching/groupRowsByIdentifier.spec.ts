import { describe, expect, it } from 'vitest';
import { toColumnKey } from '@/engine/dataset/toColumnKey';
import { toRowId } from '@/engine/dataset/toRowId';
import { toDataset } from '@/engine/testing/toDataset';
import { groupRowsByIdentifier } from './groupRowsByIdentifier';
import { MAX_ROWS_PER_RECORD } from './maxRowsPerRecord';

const EMAIL = { column: toColumnKey(0), isPhone: false };
const PHONE = { column: toColumnKey(1), isPhone: true };

function everyRowId(count: number) {
  return Array.from({ length: count }, (_, index) => toRowId(index));
}

describe('groupRowsByIdentifier', () => {
  it('groups rows by match key for each identifier column, columns in order', () => {
    const { rows } = toDataset(
      'email,phone',
      'a@x.com,212-555-0101',
      'B@x.com,212-555-0102',
      'A@X.com,(212) 555-0102',
      'c@x.com,212.555.0101'
    );

    expect(
      groupRowsByIdentifier({
        rows,
        rowIds: everyRowId(rows.length),
        identifierColumns: [EMAIL, PHONE],
      })
    ).toEqual([
      { column: EMAIL.column, value: 'a@x.com', rows: [0, 2] },
      { column: PHONE.column, value: '2125550101', rows: [0, 3] },
      { column: PHONE.column, value: '2125550102', rows: [1, 2] },
    ]);
  });

  it('skips blanks, placeholders and rows outside the ids it is given', () => {
    const { rows } = toDataset(
      'email,phone',
      ',',
      ' ,-',
      'n/a,N/A',
      'a@x.com,',
      'a@x.com,',
      'a@x.com,'
    );

    expect(
      groupRowsByIdentifier({
        rows,
        rowIds: [0, 1, 2, 3, 5].map(toRowId),
        identifierColumns: [EMAIL, PHONE],
      })
    ).toEqual([{ column: EMAIL.column, value: 'a@x.com', rows: [3, 5] }]);
  });

  it('leaves out a value on more than MAX_ROWS_PER_RECORD rows and keeps one on exactly that many', () => {
    const lines = Array.from(
      { length: 2 * MAX_ROWS_PER_RECORD + 1 },
      (_, index) =>
        index <= MAX_ROWS_PER_RECORD
          ? 'many@x.com'
          : index < 2 * MAX_ROWS_PER_RECORD
            ? 'few@x.com'
            : 'one@x.com'
    );
    const { rows } = toDataset('email', ...lines);

    const groups = groupRowsByIdentifier({
      rows,
      rowIds: everyRowId(rows.length),
      identifierColumns: [EMAIL],
    });

    expect(groups.map(({ value }) => value)).toEqual(['few@x.com']);
    expect(groups[0]?.rows).toHaveLength(MAX_ROWS_PER_RECORD - 1);
  });

  it('gives nothing for no identifier columns', () => {
    const { rows } = toDataset('email', 'a@x.com', 'a@x.com');

    expect(
      groupRowsByIdentifier({
        rows,
        rowIds: everyRowId(rows.length),
        identifierColumns: [],
      })
    ).toEqual([]);
  });
});
