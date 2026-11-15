import { describe, expect, it } from 'vitest';
import { toOutlierScale } from './toOutlierScale';

const REACH_PER_DEVIATION = 3.5 / 0.6745;

describe('toOutlierScale', () => {
  it('gives no scale when more than half the values are equal', () => {
    const values = Float64Array.from([5, 5, 5, 5, 5, 6, 7]);

    expect(toOutlierScale({ values, isOtherwisePositive: true })).toBeNull();
    expect(toOutlierScale({ values, isOtherwisePositive: false })).toBeNull();
  });

  it('limits a symmetric column to the median plus or minus 3.5 modified deviations', () => {
    const values = Float64Array.from(
      Array.from({ length: 101 }, (_, index) => index)
    );

    const scale = toOutlierScale({ values, isOtherwisePositive: false });

    expect(scale?.lowerLimit).toBeCloseTo(50 - 25.5 * REACH_PER_DEVIATION, 6);
    expect(scale?.upperLimit).toBeCloseTo(50 + 25.5 * REACH_PER_DEVIATION, 6);
    expect(scale?.isOutlier(182)).toBe(false);
    expect(scale?.isOutlier(183)).toBe(true);
    expect(scale?.isOutlier(-82)).toBe(false);
    expect(scale?.isOutlier(-83)).toBe(true);
  });

  it('judges a right-skewed positive column on a log scale and reports raw limits', () => {
    const values = Float64Array.from(
      Array.from({ length: 200 }, (_, index) => Math.exp(1 + index / 25))
    );

    const scale = toOutlierScale({ values, isOtherwisePositive: true });

    expect(scale?.lowerLimit).toBeGreaterThan(0);
    expect(scale?.upperLimit).toBeGreaterThan(Math.max(...values));
  });

  it('never calls zero or a negative number an outlier on the log scale', () => {
    const values = Float64Array.from(
      Array.from({ length: 200 }, (_, index) => Math.exp(1 + index / 25))
    );

    const scale = toOutlierScale({ values, isOtherwisePositive: true });

    expect(scale?.isOutlier(0)).toBe(false);
    expect(scale?.isOutlier(-5)).toBe(false);
  });

  it('keeps a column that is not otherwise positive on its own scale, whatever its skew', () => {
    const values = Float64Array.from(
      Array.from({ length: 200 }, (_, index) => Math.exp(1 + index / 25))
    );

    const scale = toOutlierScale({ values, isOtherwisePositive: false });

    expect(scale?.lowerLimit).toBeLessThan(0);
  });

  it('never judges a side more narrowly than the whole column', () => {
    const tight = Array.from({ length: 40 }, (_, index) => -6 + index / 40);
    const wide = Array.from({ length: 40 }, (_, index) => -5 + index / 2);
    const values = Float64Array.from([...tight, ...wide]);

    const scale = toOutlierScale({ values, isOtherwisePositive: false });

    expect(scale?.isOutlier(-8)).toBe(false);
    expect(scale?.isOutlier(-12)).toBe(true);
  });

  it('leaves zeros out of the log spread, so a column with many zeros still flags a far value', () => {
    const positives = Array.from({ length: 300 }, (_, index) =>
      Math.exp(1 + index / 40)
    );
    const values = Float64Array.from([
      ...Array<number>(200).fill(0),
      ...positives,
      1e12,
    ]);

    const scale = toOutlierScale({ values, isOtherwisePositive: true });

    expect(Number.isFinite(scale?.upperLimit)).toBe(true);
    expect(scale?.isOutlier(1e12)).toBe(true);
    expect(scale?.isOutlier(positives[150] ?? 0)).toBe(false);
  });

  it('does not change the values it is given', () => {
    const values = Float64Array.from([9, 1, 5, 3, 7, 2, 8]);

    toOutlierScale({ values, isOtherwisePositive: true });

    expect([...values]).toEqual([9, 1, 5, 3, 7, 2, 8]);
  });
});
