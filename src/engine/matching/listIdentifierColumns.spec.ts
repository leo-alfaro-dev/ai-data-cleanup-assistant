import { describe, expect, it } from 'vitest';
import type { Dataset, RowId } from '@/engine/dataset/dataset';
import { toColumnKey } from '@/engine/dataset/toColumnKey';
import { toRowId } from '@/engine/dataset/toRowId';
import { profileDataset } from '@/engine/profile/profileDataset';
import { toDataset } from '@/engine/testing/toDataset';
import { listIdentifierColumns } from './listIdentifierColumns';

function list(dataset: Dataset, rowIds = listEveryRow(dataset)) {
  return listIdentifierColumns({
    dataset,
    profile: profileDataset(dataset),
    rowIds,
  });
}

function listEveryRow(dataset: Dataset): RowId[] {
  return dataset.rows.map((_, index) => toRowId(index));
}

function rowsOf(count: number, toLine: (index: number) => string): string[] {
  return Array.from({ length: count }, (_, index) => toLine(index));
}

describe('listIdentifierColumns', () => {
  it('takes email and phone columns and flags only the phone', () => {
    const dataset = toDataset(
      'contact,mobile,city',
      ...rowsOf(
        10,
        (index) => `u${index}@example.com,212-555-010${index},City ${index % 3}`
      )
    );

    expect(list(dataset)).toEqual([
      { column: toColumnKey(0), isPhone: false },
      { column: toColumnKey(1), isPhone: true },
    ]);
  });

  it('takes a column whose header names a key, text or numeric', () => {
    const dataset = toDataset(
      'customerId,Order ID,name',
      ...rowsOf(10, (index) => `C-${index},${index},Name ${index % 2}`)
    );

    expect(list(dataset).map(({ column }) => column)).toEqual([
      toColumnKey(0),
      toColumnKey(1),
    ]);
  });

  it('leaves a column whose values are distinct but whose header and type say nothing', () => {
    const dataset = toDataset(
      'address,notes',
      ...rowsOf(10, (index) => `${index} Main Street,note number ${index}`)
    );

    expect(list(dataset)).toEqual([]);
  });

  it('leaves a header that only contains the letters of a key', () => {
    const dataset = toDataset(
      'paid,video',
      ...rowsOf(10, (index) => `${index} dollars,clip ${index}`)
    );

    expect(list(dataset)).toEqual([]);
  });

  it('keeps a column where one value in five repeats and drops one where more do', () => {
    const fiveInTen = toDataset('id', ...rowsOf(10, (index) => `${index % 8}`));
    const moreRepeats = toDataset(
      'id',
      ...rowsOf(10, (index) => `${index % 7}`)
    );

    expect(list(fiveInTen)).toHaveLength(1);
    expect(list(moreRepeats)).toEqual([]);
  });

  it('measures the share over the non-blank values', () => {
    const dataset = toDataset(
      'id',
      ...rowsOf(10, (index) => (index < 5 ? `${index}` : ''))
    );

    expect(list(dataset)).toHaveLength(1);
  });

  it('measures the share over the rows it is given, so copies do not hide an identifier', () => {
    const distinct = rowsOf(10, (index) => `u${index}@example.com`);
    const copies = rowsOf(12, () => 'u0@example.com');
    const dataset = toDataset('email', ...distinct, ...copies);
    const withoutCopies = listEveryRow(dataset).slice(0, 10);

    expect(list(dataset)).toEqual([]);
    expect(list(dataset, withoutCopies)).toEqual([
      { column: toColumnKey(0), isPhone: false },
    ]);
  });

  it('leaves out blanks and placeholders when it measures the share', () => {
    const dataset = toDataset(
      'id,name',
      ...rowsOf(20, (index) => `${index},Ada`),
      ...rowsOf(8, () => 'N/A,Ada'),
      ...rowsOf(4, () => ',Ada')
    );

    expect(list(dataset)).toEqual([{ column: toColumnKey(0), isPhone: false }]);
  });

  it('skips a column with no values', () => {
    const dataset = toDataset('id,name', ',a', ',b');

    expect(list(dataset)).toEqual([]);
  });
});
