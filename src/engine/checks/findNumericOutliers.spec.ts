import { describe, expect, it } from 'vitest';
import type { Dataset } from '@/engine/dataset/dataset';
import { toColumnKey } from '@/engine/dataset/toColumnKey';
import { toIssueId } from '@/engine/issues/toIssueId';
import { profileDataset } from '@/engine/profile/profileDataset';
import { toDataset } from '@/engine/testing/toDataset';
import { watchRowReads } from '@/engine/testing/watchRowReads';
import { findNumericOutliers } from './findNumericOutliers';

describe('findNumericOutliers', () => {
  it('flags 10,000 in a column of 1 to 100', () => {
    const dataset = toColumnDataset([...range(100), '10000']);

    const issues = findOutliers(dataset);

    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      id: toIssueId('numeric-outliers:0'),
      category: 'suspicious',
      source: 'check',
      confidence: 'medium',
      rows: [100],
      column: 0,
      suggestion: null,
      details: { kind: 'numericOutliers', median: 51 },
    });
  });

  it('reports the limits a value has to stay within', () => {
    const dataset = toColumnDataset([...range(100), '10000']);

    const details = findOutliers(dataset)[0]?.details;

    expect(details).toMatchObject({ kind: 'numericOutliers' });
    if (details?.kind !== 'numericOutliers') return;
    expect(details.lowerLimit).toBeCloseTo(51 - 132.32, 1);
    expect(details.upperLimit).toBeCloseTo(51 + 132.32, 1);
  });

  it('leaves a column that is naturally wide', () => {
    const dataset = toColumnDataset(range(100).map((step) => step * 100));

    expect(findOutliers(dataset)).toEqual([]);
  });

  it('leaves a column with no value far from the rest', () => {
    const dataset = toColumnDataset(range(200));

    expect(findOutliers(dataset)).toEqual([]);
  });

  it('is silent under 30 numeric values and flags the 30th', () => {
    expect(findOutliers(toColumnDataset([...range(28), '10000']))).toEqual([]);
    expect(findOutliers(toColumnDataset([...range(29), '10000']))).toHaveLength(
      1
    );
  });

  it('is silent when the median absolute deviation is zero', () => {
    const dataset = toColumnDataset([...Array<number>(29).fill(5), 500]);

    expect(findOutliers(dataset)).toEqual([]);
  });

  it('flags values below the lower limit as well as above the upper one in a column that goes negative', () => {
    const dataset = toColumnDataset([
      '-10000',
      ...range(100).map((value) => value - 50),
      '10000',
    ]);

    const issues = findOutliers(dataset);

    expect(issues).toHaveLength(1);
    expect(issues[0]?.id).toBe(toIssueId('numeric-outliers:0'));
    expect(issues[0]?.rows).toEqual([0, 101]);
  });

  it('reads padded, grouped and currency values as numbers', () => {
    const dataset = toColumnDataset([...range(100), ' $10,000 ']);

    expect(findOutliers(dataset)[0]?.rows).toEqual([100]);
  });

  it('skips blank cells, placeholders and text when scoring', () => {
    const dataset = toColumnDataset([
      '',
      ...range(100),
      'N/A',
      'twelve',
      '10000',
      '   ',
    ]);

    const issues = findOutliers(dataset);

    expect(issues).toHaveLength(1);
    expect(issues[0]?.rows).toEqual([103]);
  });

  describe('negative values', () => {
    it('flags a negative value in a column that is otherwise positive', () => {
      const dataset = toColumnDataset([...range(100), '-5']);

      const issues = findOutliers(dataset);

      expect(issues).toHaveLength(1);
      expect(issues[0]).toMatchObject({
        id: toIssueId('numeric-outliers:0:negatives'),
        category: 'suspicious',
        confidence: 'medium',
        rows: [100],
        column: 0,
        suggestion: null,
        details: { kind: 'negativeValues', median: 50 },
      });
    });

    it('leaves a column that is mostly negative', () => {
      const dataset = toColumnDataset(range(100).map((value) => `-${value}`));

      expect(findOutliers(dataset)).toEqual([]);
    });

    it('leaves a column where negatives are common', () => {
      const dataset = toColumnDataset([
        ...range(90),
        ...range(10).map((value) => `-${value}`),
      ]);

      expect(findOutliers(dataset)).toEqual([]);
    });

    it('does not read zero as negative', () => {
      const dataset = toColumnDataset([...range(100), '0', '-0', '0.0']);

      expect(findOutliers(dataset)).toEqual([]);
    });

    it('lists every negative once, as a negative, however far it lies', () => {
      const dataset = toColumnDataset([...range(100), '-10000', '-5', '10000']);

      const issues = findOutliers(dataset);

      expect(issues.map(({ id, rows }) => ({ id, rows }))).toEqual([
        { id: toIssueId('numeric-outliers:0'), rows: [102] },
        { id: toIssueId('numeric-outliers:0:negatives'), rows: [100, 101] },
      ]);
    });

    it('does not call a column of mostly zeros otherwise positive', () => {
      const dataset = toColumnDataset([
        -5,
        ...Array<number>(30).fill(0),
        ...range(29),
      ]);

      const ids = findOutliers(dataset).map(({ id }) => id);

      expect(ids).not.toContain(toIssueId('numeric-outliers:0:negatives'));
    });

    it('is silent under 30 numeric values', () => {
      const dataset = toColumnDataset([...range(28), '-5']);

      expect(findOutliers(dataset)).toEqual([]);
    });
  });

  describe('a column with a long tail', () => {
    it('does not flag the tail of a right-skewed positive column', () => {
      const dataset = toColumnDataset(lognormal(2000));

      const flagged = findOutliers(dataset).flatMap(({ rows }) => rows);

      expect(flagged.length).toBeLessThan(0.01 * 2000);
    });

    it('still flags a value far beyond that tail', () => {
      const dataset = toColumnDataset([...lognormal(2000), 100_000_000_000]);

      const [issue] = findOutliers(dataset);

      expect(issue?.rows).toContain(2000);
    });

    it('reports the limits in the units of the column', () => {
      const dataset = toColumnDataset([...lognormal(2000), 100_000_000_000]);

      const details = findOutliers(dataset)[0]?.details;

      expect(details?.kind).toBe('numericOutliers');
      if (details?.kind !== 'numericOutliers') return;
      expect(details.lowerLimit).toBeGreaterThan(0);
      expect(details.lowerLimit).toBeLessThan(details.median);
      expect(details.upperLimit).toBeGreaterThan(10 * details.median);
      expect(details.upperLimit).toBeLessThan(100_000_000_000);
    });

    it('never calls a zero an outlier on the log scale', () => {
      const dataset = toColumnDataset([
        ...lognormal(2000),
        ...Array<number>(100).fill(0),
      ]);

      const flagged = findOutliers(dataset).flatMap(({ rows }) => rows);

      expect(flagged.filter((row) => row >= 2000)).toEqual([]);
    });

    it('lists a negative value as a negative, not as an outlier, in a skewed column', () => {
      const dataset = toColumnDataset([...lognormal(2000), -50]);

      const issues = findOutliers(dataset);
      const outliers = issues.find(
        ({ id }) => id === toIssueId('numeric-outliers:0')
      );
      const negatives = issues.find(
        ({ id }) => id === toIssueId('numeric-outliers:0:negatives')
      );

      expect(negatives?.rows).toEqual([2000]);
      expect(outliers?.rows ?? []).not.toContain(2000);
    });

    it('judges the wide side by its own spread and no side more narrowly than the whole column', () => {
      const tightBelow = Array.from(
        { length: 40 },
        (_, index) => -6 + index / 40
      );
      const wideAbove = Array.from(
        { length: 40 },
        (_, index) => -5 + index / 2
      );
      const dataset = toColumnDataset([
        ...tightBelow,
        ...wideAbove,
        -12,
        20,
        -8,
      ]);

      const [issue] = findOutliers(dataset);

      expect(issue?.rows).toEqual([80]);
    });

    it('is not misled by a pile of equal values at the median', () => {
      const dataset = toColumnDataset([
        ...range(10),
        ...Array<number>(30).fill(20),
        ...range(30).map((step) => 20 + step),
        10_000,
      ]);

      const [issue] = findOutliers(dataset);

      expect(issue?.rows).toEqual([70]);
    });

    it('keeps a column that is only a little skewed on its own scale, where a far value is flagged', () => {
      const below = range(61).map((step) => 39 + step);
      const above = Array.from({ length: 80 }, (_, step) =>
        (101 + step * 1.3).toFixed(1)
      );
      const dataset = toColumnDataset([...below, ...above, 500]);

      const [issue] = findOutliers(dataset);

      expect(issue?.rows).toEqual([141]);
    });
  });

  it('checks each numeric column on its own and skips the others', () => {
    const lines = [...range(100), '10000'].map(
      (value, index) => `${index},${value},name ${index},${index * 3 + 1}`
    );
    const dataset = toDataset('id,spend,name,steps', ...lines);

    const issues = findOutliers(dataset);

    expect(
      issues.map(({ id, column, rows }) => ({ id, column, rows }))
    ).toEqual([
      {
        id: toIssueId('numeric-outliers:1'),
        column: toColumnKey(1),
        rows: [100],
      },
    ]);
  });

  it('finds nothing in text and date columns', () => {
    const lines = Array.from(
      { length: 40 },
      (_, index) =>
        `item ${index},2024-01-${String((index % 28) + 1).padStart(2, '0')}`
    );
    const dataset = toDataset('name,day', ...lines, 'item 40,9999-12-31');

    expect(findOutliers(dataset)).toEqual([]);
  });

  it('finds nothing in a file with one row', () => {
    expect(findOutliers(toColumnDataset(['10000']))).toEqual([]);
  });

  it('reads each row once for a single numeric column', () => {
    const dataset = toColumnDataset([...range(100), '10000']);
    const watched = watchRowReads(dataset);

    findNumericOutliers.find({
      dataset: watched.dataset,
      profile: profileDataset(dataset),
    });

    const rowReads = watched.reads.filter((property) => /^\d+$/.test(property));
    expect(rowReads).toHaveLength(dataset.rows.length);
  });
});

// A fixed seed keeps the column the same on every run.
function lognormal(count: number): number[] {
  let seed = 7;
  const random = () => {
    seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648;

    return (seed + 0.5) / 2_147_483_648;
  };

  return Array.from({ length: count }, () => {
    const normal =
      Math.sqrt(-2 * Math.log(random())) * Math.cos(2 * Math.PI * random());

    return Math.round(Math.exp(10 + normal) * 100) / 100;
  });
}

function range(count: number): number[] {
  return Array.from({ length: count }, (_, index) => index + 1);
}

function toColumnDataset(values: readonly (string | number)[]): Dataset {
  return toDataset('value,label', ...values.map((value) => `"${value}",x`));
}

function findOutliers(dataset: Dataset) {
  return findNumericOutliers.find({
    dataset,
    profile: profileDataset(dataset),
  });
}
