import { describe, expect, it } from 'vitest';
import { isPlaceholder } from './isPlaceholder';

describe('isPlaceholder', () => {
  it.each([
    'N/A',
    'n/a',
    'NA',
    'null',
    'NULL',
    'None',
    'nil',
    '-',
    '--',
    '?',
    'Unknown',
    'TBD',
    'missing',
    '  n/a  ',
    ' - ',
  ])('is true for %j', (value) => {
    expect(isPlaceholder(value)).toBe(true);
  });

  it.each([
    { name: 'a name that starts like one', value: 'Nancy' },
    { name: 'a negative number', value: '-5' },
    { name: 'a longer dash run', value: '---' },
    { name: 'a sentence containing one', value: 'not available' },
    { name: 'zero', value: '0' },
    { name: 'an empty string', value: '' },
    { name: 'spaces', value: '   ' },
  ])('is false for $name', ({ value }) => {
    expect(isPlaceholder(value)).toBe(false);
  });
});
