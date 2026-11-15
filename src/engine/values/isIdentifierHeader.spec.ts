import { describe, expect, it } from 'vitest';
import { isIdentifierHeader } from './isIdentifierHeader';

describe('isIdentifierHeader', () => {
  it('is true for headers that name a key, in any casing or separator', () => {
    for (const header of [
      'id',
      'ID',
      'customer_id',
      'Customer ID',
      'customerId',
      'order-id',
      'uuid',
      'SKU',
      'external identifier',
    ]) {
      expect(isIdentifierHeader(header), header).toBe(true);
    }
  });

  it('is false for headers that only contain the letters', () => {
    for (const header of [
      'paid',
      'valid',
      'video',
      'idea',
      'zip_code',
      'name',
    ]) {
      expect(isIdentifierHeader(header), header).toBe(false);
    }
  });

  it('is false for an empty header', () => {
    expect(isIdentifierHeader('')).toBe(false);
  });
});
