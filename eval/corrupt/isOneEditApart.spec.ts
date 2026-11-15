// cspell:ignore exaample exmple exemple exmaple exemplo exammmple bacx
import { describe, expect, it } from 'vitest';
import { isOneEditApart } from './isOneEditApart';

describe('isOneEditApart', () => {
  it.each([
    { name: 'an insertion', first: 'example', second: 'exaample' },
    { name: 'an insertion at the end', first: 'com', second: 'come' },
    { name: 'a deletion', first: 'example', second: 'exmple' },
    { name: 'a substitution', first: 'example', second: 'exemple' },
    {
      name: 'a swap of adjacent characters',
      first: 'example',
      second: 'exmaple',
    },
    { name: 'a swap at the end', first: 'com', second: 'cmo' },
  ])('accepts $name', ({ first, second }) => {
    expect(isOneEditApart({ first, second })).toBe(true);
    expect(isOneEditApart({ first: second, second: first })).toBe(true);
  });

  it.each([
    { name: 'equal strings', first: 'example', second: 'example' },
    { name: 'two substitutions', first: 'example', second: 'exemplo' },
    { name: 'two insertions', first: 'example', second: 'exammmple' },
    {
      name: 'a swap of characters that are not adjacent',
      first: 'abc',
      second: 'cba',
    },
    { name: 'a swap plus a substitution', first: 'abcd', second: 'bacx' },
    { name: 'an empty string against two characters', first: '', second: 'ab' },
  ])('rejects $name', ({ first, second }) => {
    expect(isOneEditApart({ first, second })).toBe(false);
  });
});
