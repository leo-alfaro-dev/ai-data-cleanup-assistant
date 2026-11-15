import { describe, expect, it } from 'vitest';
import { toColumnKey } from '@/engine/dataset/toColumnKey';
import { toColumnLabel } from './toColumnLabel';

describe('toColumnLabel', () => {
  const columns = [
    { key: toColumnKey(0), header: 'email' },
    { key: toColumnKey(1), header: '  ' },
    { key: toColumnKey(2), header: '' },
  ];

  it('gives the header', () => {
    expect(toColumnLabel({ columns, column: toColumnKey(0) })).toBe('email');
  });

  it('numbers a column whose header is empty or only spaces, from one', () => {
    expect(toColumnLabel({ columns, column: toColumnKey(1) })).toBe('Column 2');
    expect(toColumnLabel({ columns, column: toColumnKey(2) })).toBe('Column 3');
  });

  it('numbers a column the file does not have', () => {
    expect(toColumnLabel({ columns, column: toColumnKey(9) })).toBe(
      'Column 10'
    );
  });
});
