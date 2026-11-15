import { describe, expect, it } from 'vitest';
import { toRowKey } from './toRowKey';

describe('toRowKey', () => {
  it('gives equal rows equal keys', () => {
    expect(toRowKey({ row: ['a', 'b'] })).toBe(toRowKey({ row: ['a', 'b'] }));
  });

  it('does not let content move across a cell boundary', () => {
    expect(toRowKey({ row: ['a', 'bc'] })).not.toBe(
      toRowKey({ row: ['ab', 'c'] })
    );
  });

  it('does not let a cell imitate the encoding of two cells', () => {
    expect(toRowKey({ row: ['1:a1:b'] })).not.toBe(
      toRowKey({ row: ['a', 'b'] })
    );
  });

  it('tells an empty trailing cell from no cell', () => {
    expect(toRowKey({ row: ['a'] })).not.toBe(toRowKey({ row: ['a', ''] }));
  });

  it('keys each cell through toCellKey', () => {
    const toCellKey = (cell: string) => cell.toLowerCase();

    expect(toRowKey({ row: ['A', 'B'], toCellKey })).toBe(
      toRowKey({ row: ['a', 'b'] })
    );
  });
});
