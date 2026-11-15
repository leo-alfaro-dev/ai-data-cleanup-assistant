import { describe, expect, it } from 'vitest';
import { formatCost } from './formatCost';

describe('formatCost', () => {
  it('shows a few thousandths of a dollar with three decimals', () => {
    expect(formatCost(0.0041)).toBe('$0.004');
    expect(formatCost(0.0236)).toBe('$0.024');
    expect(formatCost(0.5)).toBe('$0.500');
  });

  it('shows a dollar or more with cents', () => {
    expect(formatCost(1)).toBe('$1.00');
    expect(formatCost(12.345)).toBe('$12.35');
  });

  it('says less than a tenth of a cent instead of rounding a real cost to zero', () => {
    expect(formatCost(0.0004)).toBe('<$0.001');
    expect(formatCost(0.00099)).toBe('<$0.001');
  });

  it('shows no cost as $0', () => {
    expect(formatCost(0)).toBe('$0');
  });
});
