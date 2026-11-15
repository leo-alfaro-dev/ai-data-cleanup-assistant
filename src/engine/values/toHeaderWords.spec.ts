import { describe, expect, it } from 'vitest';
import { toHeaderWords } from './toHeaderWords';

describe('toHeaderWords', () => {
  it('splits on separators and camel case, in lower case', () => {
    expect(toHeaderWords('customer_id')).toEqual(['customer', 'id']);
    expect(toHeaderWords('Customer ID')).toEqual(['customer', 'id']);
    expect(toHeaderWords('customerId')).toEqual(['customer', 'id']);
    expect(toHeaderWords('e-mail.address')).toEqual(['e', 'mail', 'address']);
  });

  it('gives no words for a header without letters or digits', () => {
    expect(toHeaderWords('')).toEqual([]);
    expect(toHeaderWords(' _- ')).toEqual([]);
  });
});
