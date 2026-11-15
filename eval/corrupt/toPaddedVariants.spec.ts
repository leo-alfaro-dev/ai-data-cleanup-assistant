import { describe, expect, it } from 'vitest';
import { normalizeWhitespace } from '@/engine/values/normalizeWhitespace';
import { toPaddedVariants } from './toPaddedVariants';

describe('toPaddedVariants', () => {
  it('gives spellings that whitespace normalizing undoes', () => {
    const variants = toPaddedVariants('Austin');

    expect(variants).toHaveLength(5);
    expect(variants).not.toContain('Austin');
    expect(variants.map(normalizeWhitespace)).toEqual(
      variants.map(() => 'Austin')
    );
  });

  it('pads with a non-breaking space on either side', () => {
    expect(toPaddedVariants('Austin')).toEqual(
      expect.arrayContaining(['Austin\u00a0', '\u00a0Austin'])
    );
  });
});
