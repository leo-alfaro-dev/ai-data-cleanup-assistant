import { describe, expect, it } from 'vitest';
import { quote } from './quote';

describe('quote', () => {
  it('wraps text in typographic quotes and leaves its spaces', () => {
    expect(quote('N/A')).toBe('“N/A”');
    expect(quote(' Ada ')).toBe('“ Ada ”');
  });
});
