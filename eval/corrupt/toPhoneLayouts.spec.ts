import { describe, expect, it } from 'vitest';
import { toPhoneLayouts } from './toPhoneLayouts';

describe('toPhoneLayouts', () => {
  it('writes the same digits in other layouts', () => {
    expect(toPhoneLayouts('(512) 555-0147')).toEqual([
      '512-555-0147',
      '512.555.0147',
      '512 555 0147',
    ]);
  });
});
