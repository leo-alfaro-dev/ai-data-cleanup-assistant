import { describe, expect, it } from 'vitest';
import type { Dataset } from '@/engine/dataset/dataset';
import { toColumnKey } from '@/engine/dataset/toColumnKey';
import { profileDataset } from '@/engine/profile/profileDataset';
import { toDataset } from '@/engine/testing/toDataset';
import { listEvidenceColumns } from './listEvidenceColumns';

function list(dataset: Dataset, excluded = [toColumnKey(0)]) {
  return listEvidenceColumns({ profile: profileDataset(dataset), excluded });
}

function rowsOf(count: number, toLine: (index: number) => string): string[] {
  return Array.from({ length: count }, (_, index) => toLine(index));
}

describe('listEvidenceColumns', () => {
  it('takes every column with values except the excluded ones', () => {
    const dataset = toDataset(
      'name,city,empty,spend',
      'Ada,Leeds,,1',
      'Bo,Hull,,2'
    );

    expect(list(dataset).map(({ column }) => column)).toEqual([
      toColumnKey(1),
      toColumnKey(3),
    ]);
  });

  it('flags a phone column', () => {
    const dataset = toDataset(
      'name,phone',
      ...rowsOf(10, (index) => `Name ${index},212-555-010${index}`)
    );

    expect(list(dataset).map(({ isPhone }) => isPhone)).toEqual([true]);
  });

  it('marks a value held by more than one row in ten as common', () => {
    const dataset = toDataset(
      'name,country,city',
      ...rowsOf(
        100,
        (index) =>
          `Name ${index},${index < 40 ? 'Chile' : `Land ${index}`},${index < 10 ? 'Lima' : `Town ${index}`}`
      )
    );

    const [country, city] = list(dataset);

    expect([...(country?.commonKeys ?? [])]).toEqual(['chile']);
    expect([...(city?.commonKeys ?? [])]).toEqual([]);
  });

  it('never marks a value on as few rows as one record can have as common', () => {
    const dataset = toDataset(
      'name,city',
      ...rowsOf(
        30,
        (index) => `Name ${index},${index < 10 ? 'Lima' : `Town ${index}`}`
      )
    );

    expect(list(dataset)[0]?.commonKeys.size).toBe(0);
  });

  it('adds up case variants and layouts of one value', () => {
    const dataset = toDataset(
      'name,plan',
      ...rowsOf(100, (index) => {
        const plan = index < 6 ? 'Free' : index < 12 ? 'FREE' : `Plan ${index}`;
        return `Name ${index},${plan}`;
      })
    );

    expect([...(list(dataset)[0]?.commonKeys ?? [])]).toEqual(['free']);
  });

  it('counts phone values by their digits', () => {
    const dataset = toDataset(
      'name,phone',
      ...rowsOf(100, (index) => {
        const phone =
          index < 6
            ? '212-555-0100'
            : index < 12
              ? '(212) 555-0100'
              : `212-555-${1000 + index}`;
        return `Name ${index},${phone}`;
      })
    );

    expect([...(list(dataset)[0]?.commonKeys ?? [])]).toEqual(['2125550100']);
  });

  it('ignores blank cells and placeholders when counting', () => {
    const dataset = toDataset(
      'name,city',
      ...rowsOf(100, (index) => `Name ${index},${index < 50 ? 'N/A' : ''}`)
    );

    expect(list(dataset)[0]?.commonKeys.size).toBe(0);
  });
});
