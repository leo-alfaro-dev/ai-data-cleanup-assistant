import { describe, expect, it } from 'vitest';
import { toRowId } from './toRowId';
import { toRowNumber } from './toRowNumber';

describe('toRowNumber', () => {
  it('numbers the first data row 2, below the header', () => {
    expect(toRowNumber(toRowId(0))).toBe(2);
    expect(toRowNumber(toRowId(41))).toBe(43);
  });
});
