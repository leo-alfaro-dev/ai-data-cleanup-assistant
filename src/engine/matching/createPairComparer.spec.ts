import { describe, expect, it } from 'vitest';
import { toColumnKey } from '@/engine/dataset/toColumnKey';
import { toRowId } from '@/engine/dataset/toRowId';
import { toDataset } from '@/engine/testing/toDataset';
import { createPairComparer } from './createPairComparer';

const FIRST = toColumnKey(0);
const LAST = toColumnKey(1);
const CITY = toColumnKey(2);
const PHONE = toColumnKey(3);

const { rows } = toDataset(
  'first,last,city,phone',
  'Jon,Smith,Leeds,212-555-0101',
  'John,Smith,leeds ,(212) 555-0101',
  ',Smith,Hull,',
  'Ann,Lee,Leeds,N/A',
  'Ann,Lee,Common,'
);
const rowIds = rows.map((_, index) => toRowId(index));

function comparer(nameColumns = [FIRST, LAST]) {
  return createPairComparer({
    rows,
    rowIds,
    nameColumns,
    evidenceColumns: [
      { column: CITY, isPhone: false, commonKeys: new Set(['common']) },
      { column: PHONE, isPhone: true, commonKeys: new Set() },
    ],
  });
}

describe('createPairComparer', () => {
  it('lists the evidence columns where both rows hold the same key', () => {
    expect(
      comparer().listAgreeingColumns({ first: toRowId(0), second: toRowId(1) })
    ).toEqual([CITY, PHONE]);
  });

  it('does not count blanks, placeholders or common values as agreement', () => {
    expect(
      comparer().listAgreeingColumns({ first: toRowId(3), second: toRowId(4) })
    ).toEqual([]);
    expect(
      comparer().listAgreeingColumns({ first: toRowId(2), second: toRowId(4) })
    ).toEqual([]);
  });

  it('lists nothing for rows that agree on no column', () => {
    expect(
      comparer().listAgreeingColumns({ first: toRowId(1), second: toRowId(2) })
    ).toEqual([]);
  });

  it('averages the Jaro-Winkler score of the name columns', () => {
    const similarity = comparer().toNameSimilarity({
      first: toRowId(0),
      second: toRowId(1),
    });

    expect(similarity).toBeCloseTo((14 / 15 + 1) / 2, 10);
  });

  it('scores identical names 1 and one column with just that column', () => {
    expect(
      comparer().toNameSimilarity({ first: toRowId(3), second: toRowId(4) })
    ).toBe(1);
    expect(
      comparer([LAST]).toNameSimilarity({
        first: toRowId(0),
        second: toRowId(1),
      })
    ).toBe(1);
  });

  it('has no name similarity when a row lacks a name or there is no name column', () => {
    expect(
      comparer().toNameSimilarity({ first: toRowId(0), second: toRowId(2) })
    ).toBeNull();
    expect(
      comparer([]).toNameSimilarity({ first: toRowId(0), second: toRowId(1) })
    ).toBeNull();
  });

  it('exposes the name keys of every row, one list per name column', () => {
    expect(comparer().nameKeys).toEqual([
      ['jon', 'john', '', 'ann', 'ann'],
      ['smith', 'smith', 'smith', 'lee', 'lee'],
    ]);
  });
});
