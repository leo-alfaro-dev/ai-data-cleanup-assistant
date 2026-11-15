import { describe, expect, it } from 'vitest';
import { normalizeWhitespace } from '@/engine/values/normalizeWhitespace';
import { toInnerSpaceVariants } from './toInnerSpaceVariants';

describe('toInnerSpaceVariants', () => {
  it('doubles the inner space or swaps it for a non-breaking space', () => {
    expect(toInnerSpaceVariants('San Diego')).toEqual([
      'San  Diego',
      'San\u00a0Diego',
    ]);
  });

  it('gives spellings that whitespace normalizing undoes', () => {
    expect(toInnerSpaceVariants('San Diego').map(normalizeWhitespace)).toEqual([
      'San Diego',
      'San Diego',
    ]);
  });
});
