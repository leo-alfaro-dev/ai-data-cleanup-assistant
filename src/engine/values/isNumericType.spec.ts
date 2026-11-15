import { describe, expect, it } from 'vitest';
import { isNumericType } from './isNumericType';
import { VALUE_TYPES } from './valueType';

describe('isNumericType', () => {
  it('is true for integers and decimals only', () => {
    expect(VALUE_TYPES.filter(isNumericType)).toEqual(['integer', 'decimal']);
  });
});
