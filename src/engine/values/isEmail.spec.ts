import { describe, expect, it } from 'vitest';
import { isEmail } from './isEmail';

describe('isEmail', () => {
  it.each([
    'ada@example.com',
    'a.b+tag@sub.example.co.uk',
    'ADA@EXAMPLE.COM',
    '  ada@example.com\t',
    ' ada@example.com ',
  ])('accepts %j', (value) => {
    expect(isEmail(value)).toBe(true);
  });

  it.each([
    { name: 'an empty value', value: '' },
    { name: 'no at sign', value: 'ada.example.com' },
    { name: 'no top-level domain', value: 'ada@example' },
    { name: 'a space in the local part', value: 'ada lovelace@example.com' },
    { name: 'no local part', value: '@example.com' },
    { name: 'no domain', value: 'ada@' },
    { name: 'two at signs', value: 'ada@@example.com' },
    { name: 'an empty domain label', value: 'ada@example..com' },
    { name: 'a leading dot in the domain', value: 'ada@.com' },
    { name: 'a trailing dot', value: 'ada@example.com.' },
  ])('rejects $name', ({ value }) => {
    expect(isEmail(value)).toBe(false);
  });
});
