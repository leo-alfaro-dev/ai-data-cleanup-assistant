import { describe, expect, it } from 'vitest';
import { toRowId } from '@/engine/dataset/toRowId';
import { toGridIndex } from './toGridIndex';

describe('toGridIndex', () => {
  it('is the row id when the grid lists every row', () => {
    expect(toGridIndex({ rowId: toRowId(42), gridRowIds: null })).toBe(42);
  });

  it('is the position among the listed rows when the grid is filtered', () => {
    const gridRowIds = [toRowId(7), toRowId(40), toRowId(900)];

    expect(toGridIndex({ rowId: toRowId(40), gridRowIds })).toBe(1);
    expect(toGridIndex({ rowId: toRowId(900), gridRowIds })).toBe(2);
  });

  it('is negative for a row the filtered grid does not list', () => {
    expect(
      toGridIndex({ rowId: toRowId(8), gridRowIds: [toRowId(7)] })
    ).toBeLessThan(0);
  });
});
