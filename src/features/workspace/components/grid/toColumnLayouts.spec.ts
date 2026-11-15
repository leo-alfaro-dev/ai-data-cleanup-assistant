import { describe, expect, it } from 'vitest';
import { toColumnKey } from '@/engine/dataset/toColumnKey';
import type { ColumnProfile } from '@/engine/profile/columnProfile';
import { ROW_NUMBER_WIDTH } from './gridLayout';
import { toColumnLayouts } from './toColumnLayouts';

const columns = [
  { key: toColumnKey(0), header: 'id' },
  { key: toColumnKey(1), header: 'name' },
];

describe('toColumnLayouts', () => {
  it('places each column after the previous one, the first after the row numbers', () => {
    const layouts = toColumnLayouts({
      columns,
      widths: [100, 150],
      profile: [],
    });

    expect(layouts.map(({ left, width }) => ({ left, width }))).toEqual([
      { left: ROW_NUMBER_WIDTH, width: 100 },
      { left: ROW_NUMBER_WIDTH + 100, width: 150 },
    ]);
  });

  it('marks the columns the profile reads as numbers, and none while there is no profile', () => {
    const numeric: ColumnProfile = {
      column: toColumnKey(0),
      blankCount: 0,
      nonBlankCount: 1,
      distinctCount: 1,
      distinctValues: [],
      hasTruncatedDistinctValues: false,
      isCategorical: false,
      isIdentifierLike: false,
      typeCounts: {
        integer: 1,
        decimal: 0,
        boolean: 0,
        date: 0,
        email: 0,
        phone: 0,
        url: 0,
        text: 0,
      },
      dominantType: 'integer',
      numbers: {
        count: 1,
        minimum: 1,
        maximum: 1,
        median: 1,
        medianAbsoluteDeviation: 0,
      },
    };

    expect(
      toColumnLayouts({ columns, widths: [100, 100], profile: [numeric] }).map(
        ({ isNumeric }) => isNumeric
      )
    ).toEqual([true, false]);
    expect(
      toColumnLayouts({ columns, widths: [100, 100], profile: [] }).map(
        ({ isNumeric }) => isNumeric
      )
    ).toEqual([false, false]);
  });
});
