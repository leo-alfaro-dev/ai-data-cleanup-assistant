import { describe, expect, it } from 'vitest';
import { isPersonNounHeader } from './isPersonNounHeader';

describe('isPersonNounHeader', () => {
  it.each(['customer', 'Client', 'employee', 'Patient'])(
    'is true for %j',
    (header) => {
      expect(isPersonNounHeader(header)).toBe(true);
    }
  );

  it.each(['contact', 'user', 'customer_id', 'customers_count', 'city', ''])(
    'is false for %j',
    (header) => {
      expect(isPersonNounHeader(header)).toBe(false);
    }
  );
});
