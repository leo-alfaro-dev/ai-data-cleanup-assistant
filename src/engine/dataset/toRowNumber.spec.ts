import { describe, expect, it } from 'vitest';
import type { RowId } from './dataset';
import { toRowNumber } from './toRowNumber';

describe('toRowNumber', () => {
  it('numbers the first data row 2, below the header', () => {
    expect(toRowNumber(0 as RowId)).toBe(2);
    expect(toRowNumber(41 as RowId)).toBe(43);
  });
});
