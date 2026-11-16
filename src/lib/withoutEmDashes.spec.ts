import { describe, expect, it } from 'vitest';
import { withoutEmDashes } from './withoutEmDashes';

const DASH = '\u2014';

describe('withoutEmDashes', () => {
  it('puts a comma where a dash sits between words, spaced or not', () => {
    expect(withoutEmDashes(`Both name Ohio ${DASH} one is a typo.`)).toBe(
      'Both name Ohio, one is a typo.'
    );
    expect(withoutEmDashes(`Same city${DASH}different spelling`)).toBe(
      'Same city, different spelling'
    );
    expect(withoutEmDashes(`a ${DASH} b ${DASH} c`)).toBe('a, b, c');
  });

  it('drops a dash at either end instead of leaving a stray comma', () => {
    expect(withoutEmDashes(`${DASH} Looks wrong`)).toBe('Looks wrong');
    expect(withoutEmDashes(`Looks wrong ${DASH}`)).toBe('Looks wrong');
  });

  it('leaves text without a dash, and other dashes, as they are', () => {
    expect(withoutEmDashes('Plain text, 5-10 and 5–10.')).toBe(
      'Plain text, 5-10 and 5–10.'
    );
  });
});
