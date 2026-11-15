import { describe, expect, it } from 'vitest';
import { shortenValue } from './shortenValue';

describe('shortenValue', () => {
  it('leaves a value that fits, the edge included', () => {
    expect(shortenValue({ value: 'abc', maxLength: 3 })).toBe('abc');
    expect(shortenValue({ value: '', maxLength: 3 })).toBe('');
  });

  it('cuts a longer value to the limit and ends it with an ellipsis', () => {
    expect(shortenValue({ value: 'abcd', maxLength: 3 })).toBe('abc…');
  });
});
