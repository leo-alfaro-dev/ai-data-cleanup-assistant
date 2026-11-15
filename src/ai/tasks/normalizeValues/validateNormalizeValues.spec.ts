import { describe, expect, it } from 'vitest';
import type {
  NormalizeValuesReply,
  NormalizeValuesRequest,
} from './normalizeValuesContract';
import { MAX_REASON_LENGTH } from '../../textLimits';
import { MAX_VALUE_LENGTH } from './normalizeValuesContract';
import { validateNormalizeValues } from './validateNormalizeValues';

const request: NormalizeValuesRequest = {
  column: { key: 6, header: 'state', dominantType: 'text' },
  values: [
    { value: 'CA', count: 40 },
    { value: 'Calif.', count: 5 },
    { value: 'California', count: 30 },
    { value: 'TX', count: 25 },
    { value: 'Texas', count: 10 },
    { value: 'pending', count: 3 },
  ],
  isComplete: true,
};

function reply(partial: Partial<NormalizeValuesReply>): NormalizeValuesReply {
  return { groups: [], placeholders: [], ...partial };
}

function group(
  canonical: string,
  variants: string[]
): NormalizeValuesReply['groups'][number] {
  return { canonical, variants, reason: 'Same state.', confidence: 'high' };
}

describe('validateNormalizeValues', () => {
  it('keeps a group whose values were all sent, without the canonical among the variants', () => {
    const result = validateNormalizeValues({
      request,
      reply: reply({
        groups: [group('California', ['CA', 'Calif.', 'California'])],
      }),
    });

    expect(result.groups).toEqual([
      {
        canonical: 'California',
        isCanonicalInFile: true,
        variants: ['CA', 'Calif.'],
        reason: 'Same state.',
        confidence: 'high',
      },
    ]);
    expect(result).toMatchObject({ claimCount: 4, droppedClaims: 0 });
  });

  it('drops a variant that was not sent and counts it', () => {
    const result = validateNormalizeValues({
      request,
      reply: reply({ groups: [group('California', ['CA', 'Cali', 'Calif.'])] }),
    });

    expect(result.groups[0]?.variants).toEqual(['CA', 'Calif.']);
    expect(result).toMatchObject({ claimCount: 4, droppedClaims: 1 });
  });

  it('allows a canonical value that is not in the file, and marks it', () => {
    const result = validateNormalizeValues({
      request,
      reply: reply({ groups: [group('Calif', ['CA', 'Calif.'])] }),
    });

    expect(result.groups[0]).toMatchObject({
      canonical: 'Calif',
      isCanonicalInFile: false,
      variants: ['CA', 'Calif.'],
    });
    expect(result.droppedClaims).toBe(0);
  });

  it('lets a value join only the first group that claims it', () => {
    const result = validateNormalizeValues({
      request,
      reply: reply({
        groups: [
          group('California', ['CA', 'California']),
          group('Texas', ['CA', 'TX', 'Texas']),
        ],
      }),
    });

    expect(result.groups.map(({ canonical }) => canonical)).toEqual([
      'California',
      'Texas',
    ]);
    expect(result.groups[1]?.variants).toEqual(['TX']);
    expect(result.droppedClaims).toBe(1);
  });

  it('drops a group left with fewer than two spellings, counting the group and what it cited', () => {
    const result = validateNormalizeValues({
      request,
      reply: reply({ groups: [group('Calif', ['Cali', 'CA'])] }),
    });

    expect(result.groups).toEqual([]);
    expect(result).toMatchObject({ claimCount: 3, droppedClaims: 3 });
  });

  it('drops a group whose canonical value another group already holds', () => {
    const result = validateNormalizeValues({
      request,
      reply: reply({
        groups: [
          group('California', ['CA', 'California']),
          group('California', ['Calif.', 'California']),
        ],
      }),
    });

    expect(result.groups).toHaveLength(1);
    expect(result.droppedClaims).toBeGreaterThan(0);
  });

  it('drops a group with a blank canonical value', () => {
    const result = validateNormalizeValues({
      request,
      reply: reply({ groups: [group('  ', ['CA', 'Calif.'])] }),
    });

    expect(result.groups).toEqual([]);
    expect(result.droppedClaims).toBe(3);
  });

  it('counts a value cited twice in one group once', () => {
    const result = validateNormalizeValues({
      request,
      reply: reply({
        groups: [group('California', ['CA', 'CA', 'California'])],
      }),
    });

    expect(result.groups[0]?.variants).toEqual(['CA']);
    expect(result.droppedClaims).toBe(1);
  });

  it('keeps a placeholder that was sent, and drops one that was not or that a group already holds', () => {
    const result = validateNormalizeValues({
      request,
      reply: reply({
        groups: [group('California', ['CA', 'California'])],
        placeholders: [
          {
            value: 'pending',
            reason: 'Means to be decided.',
            confidence: 'high',
          },
          { value: 'no data', reason: 'Not in the file.', confidence: 'high' },
          {
            value: 'CA',
            reason: 'Already a state spelling.',
            confidence: 'high',
          },
        ],
      }),
    });

    expect(result.placeholders).toEqual([
      { value: 'pending', reason: 'Means to be decided.', confidence: 'high' },
    ]);
    expect(result).toMatchObject({ claimCount: 6, droppedClaims: 2 });
  });

  it('returns nothing, with nothing counted, for an empty reply', () => {
    const result = validateNormalizeValues({ request, reply: reply({}) });

    expect(result).toEqual({
      column: request.column,
      groups: [],
      placeholders: [],
      claimCount: 0,
      droppedClaims: 0,
    });
  });

  it.each([
    ['the start of a formula', '=1+1'],
    ['too long for a cell', 'c'.repeat(MAX_VALUE_LENGTH + 1)],
    ['blank', '  '],
  ])('drops a group whose canonical spelling is %s', (_name, canonical) => {
    const result = validateNormalizeValues({
      request,
      reply: reply({ groups: [group(canonical, ['CA', 'Calif.'])] }),
    });

    expect(result.groups).toEqual([]);
    expect(result.droppedClaims).toBe(3);
  });

  it('keeps a canonical spelling with a leading plus that is a plain number', () => {
    const result = validateNormalizeValues({
      request,
      reply: reply({ groups: [group('+1', ['CA', 'Calif.'])] }),
    });

    expect(result.groups).toHaveLength(1);
  });

  it('cuts a reason longer than the cap, in groups and placeholders', () => {
    const long = 'r'.repeat(MAX_REASON_LENGTH + 20);
    const cut = `${'r'.repeat(MAX_REASON_LENGTH)}…`;

    const result = validateNormalizeValues({
      request,
      reply: reply({
        groups: [{ ...group('California', ['CA', 'Calif.']), reason: long }],
        placeholders: [
          { value: 'pending', reason: long, confidence: 'medium' },
        ],
      }),
    });

    expect(result.groups[0]?.reason).toBe(cut);
    expect(result.placeholders[0]?.reason).toBe(cut);
  });

  it('skips a placeholder that a check already finds, without counting it as dropped', () => {
    const result = validateNormalizeValues({
      request: {
        ...request,
        values: [...request.values, { value: 'N/A', count: 2 }],
      },
      reply: reply({
        placeholders: [
          { value: 'N/A', reason: 'No value.', confidence: 'high' },
        ],
      }),
    });

    expect(result.placeholders).toEqual([]);
    expect(result).toMatchObject({ claimCount: 0, droppedClaims: 0 });
  });
});
