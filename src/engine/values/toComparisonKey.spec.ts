import { describe, expect, it } from 'vitest';
import { toComparisonKey } from './toComparisonKey';

describe('toComparisonKey', () => {
  it.each([
    { name: 'spacing', first: '  a  b ', second: 'a b' },
    { name: 'casing', first: 'AUSTIN', second: 'austin' },
    { name: 'casing and padding', first: ' Austin  TX ', second: 'austin tx' },
    {
      name: 'a non-breaking space',
      first: 'Ada\u00A0Lovelace',
      second: 'ada lovelace',
    },
    { name: 'a tab', first: 'Ada\tLovelace', second: 'ada lovelace' },
    { name: 'a ligature', first: 'o\uFB03ce', second: 'office' },
    { name: 'full-width letters', first: '\uFF21\uFF22\uFF23', second: 'abc' },
    {
      name: 'composed and decomposed accents',
      first: 'Caf\u00E9',
      second: 'cafe\u0301',
    },
    {
      name: 'the Angstrom sign and the letter',
      first: '\u212B',
      second: '\u00C5',
    },
    {
      name: 'spaces around a line break',
      first: 'one \n two',
      second: 'one\ntwo',
    },
  ])(
    'gives one key to values that differ only in $name',
    ({ first, second }) => {
      expect(toComparisonKey(first)).toBe(toComparisonKey(second));
    }
  );

  it.each([
    { name: 'a different letter', first: 'Austin', second: 'Austen' },
    { name: 'a missing space', first: 'a b', second: 'ab' },
    { name: 'a line break instead of a space', first: 'a\nb', second: 'a b' },
    { name: 'an accent', first: 'Caf\u00E9', second: 'Cafe' },
    { name: 'a zero-width space', first: 'a\u200Bb', second: 'ab' },
    { name: 'a hyphen', first: 'a-b', second: 'a b' },
  ])(
    'gives different keys to values that differ by $name',
    ({ first, second }) => {
      expect(toComparisonKey(first)).not.toBe(toComparisonKey(second));
    }
  );

  it('lower-cases without depending on the locale', () => {
    expect(toComparisonKey('TITLE')).toBe('title');
  });

  it('normalizes whitespace, then Unicode, then case', () => {
    expect(toComparisonKey('  \uFF21\u00A0\uFF22  ')).toBe('a b');
  });

  it('keeps an empty value empty', () => {
    expect(toComparisonKey('  \u00A0 ')).toBe('');
  });
});
