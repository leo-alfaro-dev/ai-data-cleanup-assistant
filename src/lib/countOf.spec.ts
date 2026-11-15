import { describe, expect, it } from 'vitest';
import { countOf } from './countOf';

describe('countOf', () => {
  it('uses the singular for one and the plural otherwise, zero included', () => {
    expect(countOf({ count: 1, noun: 'row' })).toBe('1 row');
    expect(countOf({ count: 2, noun: 'row' })).toBe('2 rows');
    expect(countOf({ count: 0, noun: 'row' })).toBe('0 rows');
  });

  it('groups thousands', () => {
    expect(countOf({ count: 12_500, noun: 'row' })).toBe('12,500 rows');
  });

  it('takes an irregular plural', () => {
    expect(countOf({ count: 3, noun: 'entry', plural: 'entries' })).toBe(
      '3 entries'
    );
  });
});
