import { describe, expect, it } from 'vitest';
import type {
  ConfirmDuplicatesReply,
  ConfirmDuplicatesRequest,
} from './confirmDuplicatesContract';
import { MAX_REASON_LENGTH } from '../../textLimits';
import { validateConfirmDuplicates } from './validateConfirmDuplicates';

function pair(id: number, rows: [number, number]) {
  return {
    id,
    rows,
    similarity: 0.95,
    evidence: {
      nameSimilarity: 0.95,
      agreeingColumns: [],
      sharedIdentifierColumns: [],
    },
    first: ['a', 'b', 'c'],
    second: ['a', 'b', 'c'],
  };
}

const request: ConfirmDuplicatesRequest = {
  columns: ['name', 'email', 'city'],
  pairs: [pair(0, [2, 9]), pair(1, [4, 5])],
};

function answer(
  partial: Partial<ConfirmDuplicatesReply['pairs'][number]> & { id: number }
): ConfirmDuplicatesReply['pairs'][number] {
  return {
    isDuplicate: true,
    confidence: 'high',
    reason: 'Same person.',
    keep: 'first',
    columnChoices: [],
    ...partial,
  };
}

describe('validateConfirmDuplicates', () => {
  it('keeps a confirmed pair, naming its rows as they were sent', () => {
    const result = validateConfirmDuplicates({
      request,
      reply: {
        pairs: [
          answer({
            id: 0,
            keep: 'second',
            columnChoices: [{ column: 2, keep: 'first' }],
          }),
        ],
      },
    });

    expect(result).toEqual({
      duplicates: [
        {
          rows: [2, 9],
          confidence: 'high',
          reason: 'Same person.',
          keep: 'second',
          choices: [{ column: 2, keep: 'first' }],
        },
      ],
      claimCount: 2,
      droppedClaims: 0,
    });
  });

  it('leaves nothing for a pair judged not a duplicate, and does not count its choices as dropped', () => {
    const result = validateConfirmDuplicates({
      request,
      reply: {
        pairs: [
          answer({
            id: 1,
            isDuplicate: false,
            columnChoices: [{ column: 0, keep: 'first' }],
          }),
        ],
      },
    });

    expect(result.duplicates).toEqual([]);
    expect(result).toMatchObject({ claimCount: 2, droppedClaims: 0 });
  });

  it('drops a verdict for a pair that was not sent, with its choices, and counts them', () => {
    const result = validateConfirmDuplicates({
      request,
      reply: {
        pairs: [
          answer({ id: 7, columnChoices: [{ column: 0, keep: 'first' }] }),
          answer({ id: 0 }),
        ],
      },
    });

    expect(result.duplicates.map(({ rows }) => rows)).toEqual([[2, 9]]);
    expect(result).toMatchObject({ claimCount: 3, droppedClaims: 2 });
  });

  it('answers a pair once: the first verdict counts and a repeat is dropped', () => {
    const result = validateConfirmDuplicates({
      request,
      reply: {
        pairs: [
          answer({ id: 0, keep: 'first' }),
          answer({ id: 0, keep: 'second' }),
        ],
      },
    });

    expect(result.duplicates).toHaveLength(1);
    expect(result.duplicates[0]?.keep).toBe('first');
    expect(result.droppedClaims).toBe(1);
  });

  it('drops a column choice that names a column that was not sent, or one chosen twice', () => {
    const result = validateConfirmDuplicates({
      request,
      reply: {
        pairs: [
          answer({
            id: 0,
            columnChoices: [
              { column: 1, keep: 'second' },
              { column: 3, keep: 'first' },
              { column: -1, keep: 'first' },
              { column: 1, keep: 'first' },
            ],
          }),
        ],
      },
    });

    expect(result.duplicates[0]?.choices).toEqual([
      { column: 1, keep: 'second' },
    ]);
    expect(result).toMatchObject({ claimCount: 5, droppedClaims: 3 });
  });

  it('has no field through which a new value could arrive', () => {
    const result = validateConfirmDuplicates({
      request,
      reply: {
        pairs: [
          answer({ id: 0, columnChoices: [{ column: 0, keep: 'second' }] }),
        ],
      },
    });

    const choice = result.duplicates[0]?.choices[0];
    expect(Object.keys(choice ?? {}).sort()).toEqual(['column', 'keep']);
  });

  it('returns nothing, with nothing counted, for an empty reply', () => {
    expect(
      validateConfirmDuplicates({ request, reply: { pairs: [] } })
    ).toEqual({
      duplicates: [],
      claimCount: 0,
      droppedClaims: 0,
    });
  });

  it('cuts a reason longer than the cap', () => {
    const result = validateConfirmDuplicates({
      request,
      reply: {
        pairs: [answer({ id: 0, reason: 'r'.repeat(MAX_REASON_LENGTH + 50) })],
      },
    });

    expect(result.duplicates[0]?.reason).toBe(
      `${'r'.repeat(MAX_REASON_LENGTH)}…`
    );
  });
});
