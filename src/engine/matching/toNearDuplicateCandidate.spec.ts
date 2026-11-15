import { describe, expect, it } from 'vitest';
import { toColumnKey } from '@/engine/dataset/toColumnKey';
import { toRowId } from '@/engine/dataset/toRowId';
import { toNearDuplicateCandidate } from './toNearDuplicateCandidate';

const EMAIL = toColumnKey(2);
const CITY = toColumnKey(3);
const identifiers = new Set([EMAIL]);

function candidateOf({
  agreeingColumns,
  nameSimilarity,
}: {
  agreeingColumns: ReturnType<typeof toColumnKey>[];
  nameSimilarity: number | null;
}) {
  return toNearDuplicateCandidate({
    first: toRowId(1),
    second: toRowId(4),
    agreeingColumns,
    nameSimilarity,
    identifiers,
  });
}

describe('toNearDuplicateCandidate', () => {
  it('scores a pair that shares an identifier 1 and names the shared columns', () => {
    expect(
      candidateOf({ agreeingColumns: [EMAIL, CITY], nameSimilarity: 0.5 })
    ).toEqual({
      rows: [1, 4],
      similarity: 1,
      evidence: {
        nameSimilarity: 0.5,
        agreeingColumns: [EMAIL, CITY],
        sharedIdentifierColumns: [EMAIL],
      },
    });
  });

  it('scores a pair without a shared identifier by its name similarity', () => {
    expect(
      candidateOf({ agreeingColumns: [CITY], nameSimilarity: 0.95 })
    ).toEqual({
      rows: [1, 4],
      similarity: 0.95,
      evidence: {
        nameSimilarity: 0.95,
        agreeingColumns: [CITY],
        sharedIdentifierColumns: [],
      },
    });
  });

  it('scores 0 a pair with neither a shared identifier nor a name similarity', () => {
    expect(
      candidateOf({ agreeingColumns: [CITY], nameSimilarity: null }).similarity
    ).toBe(0);
  });
});
