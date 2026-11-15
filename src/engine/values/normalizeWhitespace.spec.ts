import { describe, expect, it } from 'vitest';
import { normalizeWhitespace } from './normalizeWhitespace';

describe('normalizeWhitespace', () => {
  it.each([
    { name: 'trims and collapses runs', value: '  a   b\t', expected: 'a b' },
    { name: 'turns a tab into a space', value: 'a\tb', expected: 'a b' },
    {
      name: 'turns a non-breaking space into a space',
      value: 'a\u00A0b',
      expected: 'a b',
    },
    {
      name: 'collapses a mix of spaces and Unicode spaces',
      value: 'a \t\u00A0\u2003\u3000 b',
      expected: 'a b',
    },
    {
      name: 'trims non-breaking spaces',
      value: '\u00A0\u00A0Austin\u00A0',
      expected: 'Austin',
    },
    {
      name: 'trims leading and trailing line breaks',
      value: '\n\r\n a b \n',
      expected: 'a b',
    },
    { name: 'empties a blank value', value: ' \u00A0\t\n ', expected: '' },
    { name: 'leaves an empty value empty', value: '', expected: '' },
  ])('$name', ({ value, expected }) => {
    expect(normalizeWhitespace(value)).toBe(expected);
  });

  it.each([
    {
      name: 'removes spaces around a line break',
      value: ' line one  \n  line two ',
      expected: 'line one\nline two',
    },
    {
      name: 'removes tabs and non-breaking spaces around a line break',
      value: 'one\t\n\u00A0two',
      expected: 'one\ntwo',
    },
    {
      name: 'keeps a blank line between two lines',
      value: 'one  \n \n  two',
      expected: 'one\n\ntwo',
    },
    {
      name: 'keeps a carriage return and line feed pair',
      value: 'one \r\n two',
      expected: 'one\r\ntwo',
    },
    {
      name: 'keeps Unicode line separators',
      value: 'one \u2028 two \u2029 three',
      expected: 'one\u2028two\u2029three',
    },
    {
      name: 'still collapses runs inside each line',
      value: 'a   b \n c    d',
      expected: 'a b\nc d',
    },
  ])('keeps line breaks and $name', ({ value, expected }) => {
    expect(normalizeWhitespace(value)).toBe(expected);
  });

  it.each([
    'Austin',
    'a b',
    'Ada Lovelace',
    'line one\nline two',
    'one\n\ntwo',
    'one\r\ntwo',
    'a-b_c',
    'a\u200Bb',
    'Caf\u00E9',
  ])('returns %j as it is', (value) => {
    expect(normalizeWhitespace(value)).toBe(value);
  });

  it('leaves case and other characters alone', () => {
    expect(normalizeWhitespace('  Ab   C-d ')).toBe('Ab C-d');
  });

  it.each(['  a   b\t', ' one  \n  two ', 'x\u00A0\u00A0y', '\n\n'])(
    'gives the same result when applied again to %j',
    (value) => {
      const once = normalizeWhitespace(value);

      expect(normalizeWhitespace(once)).toBe(once);
    }
  );
});
