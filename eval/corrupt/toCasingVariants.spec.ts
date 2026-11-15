import { describe, expect, it } from 'vitest';
import { toCasingVariants } from './toCasingVariants';

describe('toCasingVariants', () => {
  it('returns the lower and upper case spellings', () => {
    expect(toCasingVariants('San Diego')).toEqual(['san diego', 'SAN DIEGO']);
  });

  it('leaves out a spelling equal to the value', () => {
    expect(toCasingVariants('TX')).toEqual(['tx']);
    expect(toCasingVariants('ava.chen@example.com')).toEqual([
      'AVA.CHEN@EXAMPLE.COM',
    ]);
  });
});
