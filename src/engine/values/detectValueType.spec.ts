import { describe, expect, it } from 'vitest';
import { detectValueType } from './detectValueType';
import type { ValueType } from './valueType';
import { VALUE_TYPES } from './valueType';

const CASES: Record<ValueType, readonly string[]> = {
  empty: ['', ' ', '\t\n', '\u00A0'],
  integer: [
    '0',
    '1',
    '34',
    ' 34 ',
    '-5',
    '007',
    '2024',
    '1,234',
    '$5',
    '50%',
    '1234567',
    '5551234567',
  ],
  decimal: ['5.00', '1.5', '-0.25', '.5', '12.5%', '$1,234.50', ' 5.0 '],
  boolean: ['true', 'false', 'TRUE', 'False', 'yes', 'No', ' yes '],
  date: [
    '2024-03-04',
    '2024/03/04',
    '03/04/2024',
    '13/04/2024',
    '04/04/2024',
    'Mar 4, 2024',
    '4 March 2024',
    ' 2024-03-04 ',
  ],
  email: ['ada@example.com', 'a.b+tag@sub.example.co.uk', 'ADA@EXAMPLE.COM'],
  url: [
    'https://example.com',
    'http://example.com/a?b=1#c',
    'www.example.com',
    'HTTPS://EXAMPLE.COM',
    'http://localhost:3000',
  ],
  phone: [
    '555-0123',
    '555.010.0123',
    '(555) 010-0123',
    '555-010-0123',
    '+1 555 010 0123',
    '+44 20 7946 0958',
    '+15550100123',
    '555 0123',
  ],
  text: [
    'Alice',
    'hello world',
    'N/A',
    'unknown',
    'abc123',
    '12abc',
    '1e5',
    'Infinity',
    'y',
    'n',
    'maybe',
    'yes please',
    '1/0',
    '3.14.15',
  ],
};

describe('detectValueType', () => {
  it.each(
    Object.entries(CASES).flatMap(([type, values]) =>
      values.map((value) => ({ type, value }))
    )
  )('reads $value as $type', ({ type, value }) => {
    expect(detectValueType(value)).toBe(type);
  });

  it('covers every value type', () => {
    expect(Object.keys(CASES).sort()).toEqual([...VALUE_TYPES].sort());
  });

  it.each([
    { name: 'an impossible date', value: '2024-02-30' },
    { name: 'an impossible slash date', value: '02/30/2024' },
    { name: 'a month-first date with hyphens', value: '03-04-2024' },
    { name: 'a date with dots', value: '04.03.2024' },
    { name: 'a date with a time', value: '2024-03-04 10:30' },
  ])('reads $name as text, not as a phone number', ({ value }) => {
    expect(detectValueType(value)).toBe('text');
  });

  it.each([
    { name: 'a domain without a scheme', value: 'example.com' },
    { name: 'a scheme without a host', value: 'https://' },
    { name: 'www without a host', value: 'www.' },
    { name: 'another scheme', value: 'ftp://example.com' },
    { name: 'a URL inside a sentence', value: 'see https://example.com' },
    { name: 'a URL with a space', value: 'https://example .com' },
  ])('does not read $name as a URL', ({ value }) => {
    expect(detectValueType(value)).toBe('text');
  });

  it.each([
    { name: 'no top-level domain', value: 'ada@example' },
    { name: 'a space in the local part', value: 'ada lovelace@example.com' },
    { name: 'a space before the at sign', value: 'ada @example.com' },
    { name: 'no local part', value: '@example.com' },
    { name: 'no domain', value: 'ada@' },
    { name: 'two at signs', value: 'ada@@example.com' },
    { name: 'an empty domain label', value: 'ada@example..com' },
    { name: 'a leading dot in the domain', value: 'ada@.com' },
    { name: 'a trailing dot', value: 'ada@example.com.' },
  ])('does not read $name as an email', ({ value }) => {
    expect(detectValueType(value)).toBe('text');
  });

  it.each([
    { name: 'six digits', value: '555-012' },
    { name: 'sixteen digits', value: '1234-5678-9012-3456' },
    { name: 'letters after the digits', value: '555-0123 ext 5' },
    { name: 'a leading hyphen', value: '-555-0123' },
    { name: 'a colon', value: '555:0123' },
  ])('does not read $name as a phone number', ({ value }) => {
    expect(detectValueType(value)).toBe('text');
  });

  it.each([
    { name: 'seven digits', value: '555-0123' },
    { name: 'fifteen digits', value: '+12 345 678 901 2345' },
  ])('reads $name as a phone number', ({ value }) => {
    expect(detectValueType(value)).toBe('phone');
  });

  it('reads 1 and 0 as integers, not booleans', () => {
    expect(detectValueType('1')).toBe('integer');
    expect(detectValueType('0')).toBe('integer');
  });

  it('prefers a number over a date or a phone number', () => {
    expect(detectValueType('20240304')).toBe('integer');
    expect(detectValueType('5551234')).toBe('integer');
    expect(detectValueType('555.0123')).toBe('decimal');
  });

  it('calls a number decimal only when it is written with a decimal part', () => {
    expect(detectValueType('5')).toBe('integer');
    expect(detectValueType('5.0')).toBe('decimal');
    expect(detectValueType('1,000')).toBe('integer');
    expect(detectValueType('1,000.00')).toBe('decimal');
  });
});
