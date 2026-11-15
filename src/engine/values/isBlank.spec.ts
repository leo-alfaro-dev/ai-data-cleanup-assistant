import { describe, expect, it } from 'vitest';
import { isBlank } from './isBlank';

describe('isBlank', () => {
  it.each([
    { name: 'an empty string', value: '' },
    { name: 'spaces', value: '   ' },
    { name: 'a tab', value: '\t' },
    { name: 'line breaks', value: '\r\n' },
    { name: 'a non-breaking space', value: '\u00A0' },
    { name: 'other Unicode spaces', value: '\u2003\u3000' },
    { name: 'a mix of whitespace', value: ' \u00A0\t\n ' },
  ])('is true for $name', ({ value }) => {
    expect(isBlank(value)).toBe(true);
  });

  it.each([
    { name: 'a letter', value: 'a' },
    { name: 'a letter between spaces', value: ' a ' },
    { name: 'a letter after a non-breaking space', value: '\u00A0a' },
    { name: 'zero', value: '0' },
    { name: 'a dash', value: '-' },
    { name: 'a placeholder', value: 'N/A' },
  ])('is false for $name', ({ value }) => {
    expect(isBlank(value)).toBe(false);
  });
});
