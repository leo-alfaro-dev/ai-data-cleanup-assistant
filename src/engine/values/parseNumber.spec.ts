import { describe, expect, it } from 'vitest';
import { parseNumber } from './parseNumber';

describe('parseNumber', () => {
  it.each([
    { value: '34', expected: 34 },
    { value: '0', expected: 0 },
    { value: '007', expected: 7 },
    { value: '1234.5', expected: 1234.5 },
    { value: '0.5', expected: 0.5 },
    { value: '-5', expected: -5 },
    { value: '-0.25', expected: -0.25 },
  ])('reads the plain number $value', ({ value, expected }) => {
    expect(parseNumber(value)).toBe(expected);
  });

  it.each([
    { value: '1,234', expected: 1234 },
    { value: '1,234.50', expected: 1234.5 },
    { value: '1,234,567.89', expected: 1234567.89 },
    { value: '12,345', expected: 12345 },
    { value: '123,456', expected: 123456 },
    { value: '-1,234.5', expected: -1234.5 },
  ])('reads the grouped number $value', ({ value, expected }) => {
    expect(parseNumber(value)).toBe(expected);
  });

  it.each([
    { value: '$5', expected: 5 },
    { value: '€1,234.50', expected: 1234.5 },
    { value: '£5.99', expected: 5.99 },
    { value: '¥1,000', expected: 1000 },
    { value: '₹250', expected: 250 },
    { value: '₩5', expected: 5 },
    { value: '-$5', expected: -5 },
    { value: '$-5', expected: -5 },
    { value: '-$1,234.50', expected: -1234.5 },
  ])('reads the amount $value', ({ value, expected }) => {
    expect(parseNumber(value)).toBe(expected);
  });

  it.each([
    { value: '50%', expected: 50 },
    { value: '12.5%', expected: 12.5 },
    { value: '-3%', expected: -3 },
    { value: '1,000%', expected: 1000 },
  ])('reads $value as written, not as a fraction', ({ value, expected }) => {
    expect(parseNumber(value)).toBe(expected);
  });

  it.each([
    { value: '.5', expected: 0.5 },
    { value: '-.5', expected: -0.5 },
    { value: '$.99', expected: 0.99 },
    { value: '.5%', expected: 0.5 },
  ])(
    'reads $value, a decimal part without a whole part',
    ({ value, expected }) => {
      expect(parseNumber(value)).toBe(expected);
    }
  );

  it.each([
    { name: 'spaces', value: ' 34 ', expected: 34 },
    {
      name: 'non-breaking spaces',
      value: '\u00A0$1,234.50\u00A0',
      expected: 1234.5,
    },
    { name: 'a tab and a line break', value: '\t-5\n', expected: -5 },
  ])('ignores surrounding $name', ({ value, expected }) => {
    expect(parseNumber(value)).toBe(expected);
  });

  it.each(['-0', '0.0', '-0.00%'])(
    'reads %s as zero, never negative zero',
    (value) => {
      expect(Object.is(parseNumber(value), 0)).toBe(true);
    }
  );

  it.each([
    { name: 'an empty value', value: '' },
    { name: 'a blank value', value: ' \u00A0 ' },
    { name: 'a lone minus', value: '-' },
    { name: 'a lone currency symbol', value: '$' },
    { name: 'a lone percent sign', value: '%' },
    { name: 'a lone point', value: '.' },
    { name: 'text', value: 'abc' },
    { name: 'a placeholder', value: 'N/A' },
    { name: 'a number followed by text', value: '12abc' },
    { name: 'a plus sign', value: '+5' },
    { name: 'a hyphen inside digits', value: '12-34' },
    { name: 'a date', value: '2024-03-04' },
    { name: 'a phone number', value: '555-0123' },
  ])('rejects $name', ({ value }) => {
    expect(parseNumber(value)).toBeNull();
  });

  it.each([
    { name: 'a short last group', value: '1,23' },
    { name: 'a decimal comma', value: '1,50' },
    { name: 'uneven groups', value: '12,34,5' },
    { name: 'a long first group', value: '1234,567' },
    { name: 'a long last group', value: '1,2345' },
    { name: 'a first group starting with zero', value: '0,500' },
    { name: 'a trailing comma', value: '1,' },
    { name: 'a leading comma', value: ',5' },
    { name: 'a European thousands and decimal format', value: '1.234,50' },
    { name: 'space grouping', value: '1 234' },
    { name: 'underscore grouping', value: '1_000' },
  ])('rejects $name', ({ value }) => {
    expect(parseNumber(value)).toBeNull();
  });

  it.each([
    { name: 'an exponent', value: '1e5' },
    { name: 'an upper-case exponent', value: '1E5' },
    { name: 'Infinity', value: 'Infinity' },
    { name: 'negative Infinity', value: '-Infinity' },
    { name: 'NaN', value: 'NaN' },
    { name: 'hexadecimal', value: '0x1F' },
    { name: 'a trailing point', value: '5.' },
    { name: 'two points', value: '1.2.3' },
    { name: 'a doubled point', value: '1..2' },
  ])('rejects $name', ({ value }) => {
    expect(parseNumber(value)).toBeNull();
  });

  it.each([
    { name: 'two minus signs', value: '--5' },
    { name: 'a minus on each side of the currency', value: '-$-5' },
    { name: 'a space after the minus', value: '- 5' },
    { name: 'a space after the currency', value: '$ 5' },
    { name: 'a space before the percent sign', value: '5 %' },
    { name: 'a currency symbol after the digits', value: '5$' },
    { name: 'a percent sign before the digits', value: '%5' },
    { name: 'a currency symbol and a percent sign', value: '$5%' },
    { name: 'two percent signs', value: '5%%' },
  ])('rejects $name', ({ value }) => {
    expect(parseNumber(value)).toBeNull();
  });

  it('rejects digits too long to be a finite number', () => {
    expect(parseNumber('9'.repeat(400))).toBeNull();
  });
});
