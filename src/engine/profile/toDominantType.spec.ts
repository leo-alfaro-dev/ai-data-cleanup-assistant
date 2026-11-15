import { describe, expect, it } from 'vitest';
import type { TypeCounts } from './columnProfile';
import { toDominantType } from './toDominantType';

describe('toDominantType', () => {
  it.each([
    { name: 'text', counts: { text: 8, integer: 2 }, expected: 'text' },
    { name: 'email', counts: { email: 9, text: 1 }, expected: 'email' },
    { name: 'date', counts: { date: 10 }, expected: 'date' },
    { name: 'boolean', counts: { boolean: 4, text: 1 }, expected: 'boolean' },
  ] satisfies {
    name: string;
    counts: Partial<TypeCounts>;
    expected: string;
  }[])('names $name when it reaches 80%', ({ counts, expected }) => {
    expect(toDominantType(withCounts(counts))).toBe(expected);
  });

  it('accepts a share of exactly 80% without rounding error', () => {
    expect(toDominantType(withCounts({ text: 12, integer: 3 }))).toBe('text');
  });

  it('is mixed just under 80%', () => {
    expect(toDominantType(withCounts({ text: 79, date: 21 }))).toBe('mixed');
  });

  it('is mixed when no type leads', () => {
    expect(toDominantType(withCounts({ integer: 2, text: 2, date: 1 }))).toBe(
      'mixed'
    );
  });

  it('names integer when integers alone reach 80%', () => {
    expect(toDominantType(withCounts({ integer: 9, decimal: 1 }))).toBe(
      'integer'
    );
  });

  it('names decimal when decimals alone reach 80%', () => {
    expect(
      toDominantType(withCounts({ decimal: 8, integer: 1, text: 1 }))
    ).toBe('decimal');
  });

  it('counts integers toward decimal when together they reach 80%', () => {
    expect(
      toDominantType(withCounts({ integer: 5, decimal: 4, text: 1 }))
    ).toBe('decimal');
  });

  it('is mixed when integers and decimals together stay under 80%', () => {
    expect(
      toDominantType(withCounts({ integer: 4, decimal: 3, text: 3 }))
    ).toBe('mixed');
  });
});

function withCounts(overrides: Partial<TypeCounts>) {
  const typeCounts: TypeCounts = {
    integer: 0,
    decimal: 0,
    boolean: 0,
    date: 0,
    email: 0,
    phone: 0,
    url: 0,
    text: 0,
    ...overrides,
  };
  const nonBlankCount = Object.values(typeCounts).reduce(
    (total, count) => total + count,
    0
  );

  return { typeCounts, nonBlankCount };
}
