import { describe, expect, it } from 'vitest';
import { standardizeDate } from './standardizeDate';

describe('standardizeDate', () => {
  it.each([
    { value: '03/25/2024', format: 'YYYY-MM-DD', expected: '2024-03-25' },
    { value: '2024-03-25', format: 'MM/DD/YYYY', expected: '03/25/2024' },
    { value: '25/03/2024', format: 'MM/DD/YYYY', expected: '03/25/2024' },
    { value: 'Mar 7, 2024', format: 'YYYY-MM-DD', expected: '2024-03-07' },
    { value: '7 March 2024', format: 'MMM D, YYYY', expected: 'Mar 7, 2024' },
    { value: '2024-3-5', format: 'YYYY-MM-DD', expected: '2024-03-05' },
    { value: '1/15/2024', format: 'MM/DD/YYYY', expected: '01/15/2024' },
    { value: ' 2024-03-01', format: 'YYYY-MM-DD', expected: '2024-03-01' },
    { value: '03/03/2024', format: 'YYYY-MM-DD', expected: '2024-03-03' },
  ] as const)(
    'writes $value as $expected in $format',
    ({ value, format, expected }) => {
      expect(standardizeDate({ value, format })).toBe(expected);
    }
  );

  it.each([
    { name: 'a date already written that way', value: '2024-03-25' },
    { name: 'a date that reads two ways', value: '03/04/2024' },
    { name: 'text', value: 'soon' },
    { name: 'a number', value: '20240325' },
    { name: 'an empty cell', value: '' },
  ])('gives null for $name', ({ value }) => {
    expect(standardizeDate({ value, format: 'YYYY-MM-DD' })).toBeNull();
  });

  it('gives null for a same-day slash date already in that slash order', () => {
    expect(
      standardizeDate({ value: '03/03/2024', format: 'MM/DD/YYYY' })
    ).toBeNull();
  });
});
