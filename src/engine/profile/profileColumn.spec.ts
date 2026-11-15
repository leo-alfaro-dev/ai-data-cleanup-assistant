import { describe, expect, it } from 'vitest';
import { toDataset } from '@/engine/testing/toDataset';
import type { ColumnProfile, NumberSummary } from './columnProfile';
import { MAX_DISTINCT_VALUES, profileColumn } from './profileColumn';

describe('profileColumn', () => {
  it('counts blank and non-blank cells, non-breaking spaces and tabs included', () => {
    const profile = profileValues(['a', '', ' ', '\u00A0', '\t', 'b']);

    expect(profile.blankCount).toBe(4);
    expect(profile.nonBlankCount).toBe(2);
  });

  it('keys distinct values by normalized form, most frequent first, ties by first appearance', () => {
    const profile = profileValues([
      ' CA',
      'ca',
      'CA',
      'CA ',
      'NY',
      'ca',
      'NY',
      'New   York',
      'New York',
    ]);

    expect(profile.distinctCount).toBe(4);
    expect(profile.distinctValues).toEqual([
      { value: 'CA', count: 3 },
      { value: 'ca', count: 2 },
      { value: 'NY', count: 2 },
      { value: 'New York', count: 2 },
    ]);
  });

  it('describes a numeric column with one extreme value without letting it move the median or deviation', () => {
    const profile = profileValues([
      ...['1', '2', '3', '4', '5', '6', '7', '8', '9'],
      '10000',
    ]);

    expect(profile.dominantType).toBe('integer');
    expect(numbersOf(profile)).toEqual({
      count: 10,
      minimum: 1,
      maximum: 10000,
      median: 5.5,
      medianAbsoluteDeviation: 2.5,
    });
  });

  it('weights type shares by how often each value appears', () => {
    const profile = profileValues(['a', 'a', 'a', 'a', '5']);

    expect(profile).toMatchObject({
      dominantType: 'text',
      typeCounts: { text: 4, integer: 1 },
    });
  });

  it('names decimal for a column that mixes integers and decimals', () => {
    const profile = profileValues([
      ...['5', '5.50', '12', '7.25', '3', '4.75', '8', '9.99', '6', '10.5'],
    ]);

    expect(profile).toMatchObject({
      typeCounts: { integer: 5, decimal: 5 },
      dominantType: 'decimal',
    });
    expect(numbersOf(profile)).toMatchObject({ count: 10, minimum: 3 });
  });

  it('names integer when integers alone reach 80%', () => {
    const profile = profileValues([
      ...Array.from({ length: 9 }, (_, index) => String(index)),
      '2.5',
    ]);

    expect(profile.dominantType).toBe('integer');
    expect(numbersOf(profile).count).toBe(10);
  });

  it('summarizes only the numbers of a numeric column with a stray value', () => {
    const profile = profileValues([
      ...Array.from({ length: 9 }, (_, index) => String(index + 1)),
      'n/a',
    ]);

    expect(profile.dominantType).toBe('integer');
    expect(numbersOf(profile)).toMatchObject({
      count: 9,
      minimum: 1,
      maximum: 9,
      median: 5,
    });
  });

  it('describes the date formats of a date column', () => {
    const profile = profileValues([
      ...['2024-01-05', '2024-01-06', '2024-02-01', '2024-02-02'],
      ...['2024-02-03', '2024-02-04', '13/01/2024', '03/04/2024', '04/04/2024'],
    ]);

    expect(profile.dominantType).toBe('date');
    expect(datesOf(profile)).toEqual({
      formatCounts: {
        'YYYY-MM-DD': 6,
        'YYYY/MM/DD': 0,
        'MM/DD/YYYY': 0,
        'DD/MM/YYYY': 1,
        'MMM D, YYYY': 0,
        'D MMM YYYY': 0,
      },
      unknownOrderCount: 2,
      ambiguousCount: 1,
    });
  });

  it('flags a column of repeating values as categorical and not identifier-like', () => {
    const profile = profileValues(
      cycle({ values: ['Retail', 'Online', 'Partner'], length: 90 })
    );

    expect(profile).toMatchObject({
      distinctCount: 3,
      isCategorical: true,
      isIdentifierLike: false,
    });
  });

  it('allows distinct values up to half the non-blank cells in a categorical column', () => {
    const atHalf = profileValues(
      cycle({ values: ['a', 'b', 'c', 'd', 'e'], length: 10 })
    );
    const overHalf = profileValues(
      cycle({ values: ['a', 'b', 'c', 'd', 'e', 'f'], length: 10 })
    );

    expect(atHalf.isCategorical).toBe(true);
    expect(overHalf.isCategorical).toBe(false);
  });

  it('allows up to 200 distinct values in a categorical column', () => {
    const values = Array.from({ length: 201 }, (_, index) => `value ${index}`);
    const atLimit = values.slice(0, 200);
    const overLimit = values;

    expect(profileValues([...atLimit, ...atLimit]).isCategorical).toBe(true);
    expect(
      profileValues([...overLimit, ...overLimit, ...overLimit]).isCategorical
    ).toBe(false);
  });

  it('flags a column of unique values as identifier-like and not categorical', () => {
    const profile = profileValues(
      Array.from({ length: 20 }, (_, index) => `ID-${index}`)
    );

    expect(profile).toMatchObject({
      distinctCount: 20,
      isIdentifierLike: true,
      isCategorical: false,
    });
  });

  it('is identifier-like from 95% distinct values', () => {
    const ids = Array.from({ length: 20 }, (_, index) => `ID-${index}`);
    const nineteenDistinct = [...ids.slice(0, 19), 'ID-0'];
    const eighteenDistinct = [...ids.slice(0, 18), 'ID-0', 'ID-1'];

    expect(profileValues(nineteenDistinct).isIdentifierLike).toBe(true);
    expect(profileValues(eighteenDistinct).isIdentifierLike).toBe(false);
  });

  it('names no dominant type and adds no summary for a column of mixed values', () => {
    const profile = profileValues(['1', '2', 'abc', 'def', '2024-01-01']);

    expect(profile).toMatchObject({
      dominantType: 'mixed',
      typeCounts: { integer: 2, text: 2, date: 1 },
    });
    expect(profile).not.toHaveProperty('numbers');
    expect(profile).not.toHaveProperty('dates');
  });

  it('adds no summary for other dominant types', () => {
    const profile = profileValues(['Ada', 'Bo', 'Cy', 'Di']);

    expect(profile.dominantType).toBe('text');
    expect(profile).not.toHaveProperty('numbers');
    expect(profile).not.toHaveProperty('dates');
  });

  it('gives an all-blank column its own representation', () => {
    const profile = profileValues(['', ' ', '\u00A0']);

    expect(profile).toMatchObject({
      blankCount: 3,
      nonBlankCount: 0,
      distinctCount: 0,
      distinctValues: [],
      hasTruncatedDistinctValues: false,
      isCategorical: false,
      isIdentifierLike: false,
      dominantType: 'empty',
    });
    expect(profile).not.toHaveProperty('typeCounts');
  });

  it('keeps only the most frequent distinct values past the limit and still counts every one', () => {
    const values = Array.from(
      { length: MAX_DISTINCT_VALUES + 2 },
      (_, index) => `value ${index}`
    );
    const profile = profileValues([...values, 'value 7', 'value 7']);

    expect(profile.distinctCount).toBe(MAX_DISTINCT_VALUES + 2);
    expect(profile.nonBlankCount).toBe(MAX_DISTINCT_VALUES + 4);
    expect(profile.hasTruncatedDistinctValues).toBe(true);
    expect(profile.distinctValues).toHaveLength(MAX_DISTINCT_VALUES);
    expect(profile.distinctValues[0]).toEqual({ value: 'value 7', count: 3 });
    expect(profile.distinctValues[1]).toEqual({ value: 'value 0', count: 1 });
    expect(profile).toMatchObject({
      typeCounts: { text: MAX_DISTINCT_VALUES + 4 },
    });
  });

  it('does not truncate a column at the limit', () => {
    const profile = profileValues(
      Array.from(
        { length: MAX_DISTINCT_VALUES },
        (_, index) => `value ${index}`
      )
    );

    expect(profile.distinctValues).toHaveLength(MAX_DISTINCT_VALUES);
    expect(profile.hasTruncatedDistinctValues).toBe(false);
  });

  it('profiles the column it is given', () => {
    const dataset = toDataset('name,age', 'Ada,36', 'Bo,41');
    const column = dataset.columns[1]?.key;
    if (column === undefined) throw new Error('Expected two columns');

    const profile = profileColumn({ dataset, column });

    expect(profile.column).toBe(column);
    expect(profile.dominantType).toBe('integer');
  });

  it('returns plain data that survives serialization', () => {
    const profile = profileValues(['5', '5.5', '7', '2024-01-01', '']);

    expect(JSON.parse(JSON.stringify(profile))).toEqual(profile);
  });
});

function profileValues(values: readonly string[]): ColumnProfile {
  const dataset = toDataset(
    'id,value',
    ...values.map((value, index) => `${index},"${value.replaceAll('"', '""')}"`)
  );
  const column = dataset.columns[1]?.key;
  if (column === undefined) throw new Error('Expected two columns');

  return profileColumn({ dataset, column });
}

function cycle({
  values,
  length,
}: {
  values: readonly string[];
  length: number;
}): string[] {
  return Array.from(
    { length },
    (_, index) => values[index % values.length] ?? ''
  );
}

function numbersOf(profile: ColumnProfile): NumberSummary {
  const isNumeric =
    profile.dominantType === 'integer' || profile.dominantType === 'decimal';
  if (!isNumeric)
    throw new Error(`Expected numbers, got ${profile.dominantType}`);

  return profile.numbers;
}

function datesOf(profile: ColumnProfile) {
  if (profile.dominantType !== 'date') {
    throw new Error(`Expected dates, got ${profile.dominantType}`);
  }

  return profile.dates;
}
