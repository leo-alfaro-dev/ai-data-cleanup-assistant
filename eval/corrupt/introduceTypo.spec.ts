import { describe, expect, it } from 'vitest';
import { EMAIL_DOMAINS } from '../generate/emailDomains';
import { FIRST_NAMES } from '../generate/firstNames';
import { LAST_NAMES } from '../generate/lastNames';
import { createRandom } from '../generate/createRandom';
import { introduceTypo } from './introduceTypo';
import { isOneEditApart } from './isOneEditApart';

describe('introduceTypo', () => {
  it('changes a value by exactly one edit and keeps its first character', () => {
    const random = createRandom(23);
    const values = [
      ...FIRST_NAMES,
      ...LAST_NAMES,
      ...EMAIL_DOMAINS.flatMap((domain) => domain.split('.')),
    ];

    const failures = values.flatMap((value) =>
      Array.from({ length: 30 }, () => introduceTypo({ value, random })).filter(
        (typo) =>
          !isOneEditApart({ first: value, second: typo }) ||
          typo.charAt(0) !== value.charAt(0)
      )
    );

    expect(failures).toEqual([]);
  });

  it('uses every kind of edit', () => {
    const random = createRandom(29);
    const typos = Array.from({ length: 200 }, () =>
      introduceTypo({ value: 'example', random })
    );

    const lengths = new Set(typos.map((typo) => typo.length));
    const hasSwap = typos.some(
      (typo) =>
        typo.length === 'example'.length &&
        [...typo].sort().join('') === [...'example'].sort().join('')
    );

    expect(lengths).toEqual(new Set([6, 7, 8]));
    expect(hasSwap).toBe(true);
  });

  it('still edits a value that has no pair of different neighbors to swap', () => {
    const random = createRandom(31);

    expect(introduceTypo({ value: 'Lee', random })).not.toBe('Lee');
  });

  it('is repeatable for a seed', () => {
    expect(introduceTypo({ value: 'Garcia', random: createRandom(37) })).toBe(
      introduceTypo({ value: 'Garcia', random: createRandom(37) })
    );
  });

  it('throws on a value too short to edit', () => {
    expect(() =>
      introduceTypo({ value: 'a', random: createRandom(1) })
    ).toThrow('Cannot introduce a typo');
  });
});
