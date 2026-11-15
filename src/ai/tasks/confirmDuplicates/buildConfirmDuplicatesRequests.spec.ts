import { describe, expect, it } from 'vitest';
import { toColumnKey } from '@/engine/dataset/toColumnKey';
import { toRowId } from '@/engine/dataset/toRowId';
import type { NearDuplicateCandidate } from '@/engine/matching/nearDuplicateCandidate';
import { toDataset } from '@/engine/testing/toDataset';
import { MAX_CELL_LENGTH, MAX_HEADER_LENGTH } from '../../textLimits';
import { buildConfirmDuplicatesRequests } from './buildConfirmDuplicatesRequests';
import {
  confirmDuplicatesRequest,
  MAX_COLUMNS_PER_PAIR,
  MAX_PAIRS_PER_REQUEST,
} from './confirmDuplicatesContract';

const dataset = toDataset(
  'name,email,city',
  'Ada Lovelace,ada@example.com,London',
  'Ada Lovelase,ada@example.com,Londn',
  'Bo Ng,bo@example.com,Oslo'
);

function candidate(
  first: number,
  second: number,
  similarity = 0.97
): NearDuplicateCandidate {
  return {
    rows: [toRowId(first), toRowId(second)],
    similarity,
    evidence: {
      nameSimilarity: 0.9712,
      agreeingColumns: [toColumnKey(1)],
      sharedIdentifierColumns: [toColumnKey(1)],
    },
  };
}

describe('buildConfirmDuplicatesRequests', () => {
  it('sends the headers and both rows of each pair as they are in the file, with its evidence', () => {
    const [request] = buildConfirmDuplicatesRequests({
      dataset,
      candidates: [candidate(0, 1)],
    });

    expect(request).toEqual({
      columns: ['name', 'email', 'city'],
      pairs: [
        {
          id: 0,
          rows: [0, 1],
          similarity: 0.97,
          evidence: {
            nameSimilarity: 0.97,
            agreeingColumns: [1],
            sharedIdentifierColumns: [1],
          },
          first: ['Ada Lovelace', 'ada@example.com', 'London'],
          second: ['Ada Lovelase', 'ada@example.com', 'Londn'],
        },
      ],
    });
    expect(confirmDuplicatesRequest.safeParse(request).success).toBe(true);
  });

  it('keeps the strongest first order of the candidates and numbers the pairs from zero', () => {
    const [request] = buildConfirmDuplicatesRequests({
      dataset,
      candidates: [candidate(0, 1, 1), candidate(1, 2, 0.93)],
    });

    expect(request?.pairs.map(({ id, rows }) => ({ id, rows }))).toEqual([
      { id: 0, rows: [0, 1] },
      { id: 1, rows: [1, 2] },
    ]);
  });

  it('sends nothing when there are no candidates', () => {
    expect(buildConfirmDuplicatesRequests({ dataset, candidates: [] })).toEqual(
      []
    );
  });

  it('sends at most the cap of pairs, the strongest', () => {
    const candidates = Array.from({ length: MAX_PAIRS_PER_REQUEST + 20 }, () =>
      candidate(0, 1)
    );

    const [request] = buildConfirmDuplicatesRequests({ dataset, candidates });

    expect(request?.pairs).toHaveLength(MAX_PAIRS_PER_REQUEST);
  });

  it('shortens a value longer than the cap with an ellipsis, and sends one as long as the cap whole', () => {
    const edge = 'e'.repeat(MAX_CELL_LENGTH);
    const long = 'l'.repeat(MAX_CELL_LENGTH + 40);
    const wide = toDataset('a,b', `${edge},${long}`, `x,y`);

    const [request] = buildConfirmDuplicatesRequests({
      dataset: wide,
      candidates: [candidate(0, 1)],
    });

    expect(request?.pairs[0]?.first).toEqual([
      edge,
      `${'l'.repeat(MAX_CELL_LENGTH)}…`,
    ]);
    expect(confirmDuplicatesRequest.safeParse(request).success).toBe(true);
  });

  it('shortens a header longer than the cap, so the request still passes its contract', () => {
    const header = 'h'.repeat(MAX_HEADER_LENGTH + 150);
    const wide = toDataset(`${header},b`, 'x,y', 'x,z');

    const [request] = buildConfirmDuplicatesRequests({
      dataset: wide,
      candidates: [candidate(0, 1)],
    });

    expect(request?.columns[0]).toBe(`${'h'.repeat(MAX_HEADER_LENGTH)}…`);
    expect(confirmDuplicatesRequest.safeParse(request).success).toBe(true);
  });

  it('rejects a pair whose rows do not hold one cell per column', () => {
    const [request] = buildConfirmDuplicatesRequests({
      dataset,
      candidates: [candidate(0, 1)],
    });
    const [pair] = request?.pairs ?? [];
    if (!request || !pair) throw new Error('Expected a request');

    const short = {
      ...request,
      pairs: [{ ...pair, first: pair.first.slice(1) }],
    };

    expect(confirmDuplicatesRequest.safeParse(short).success).toBe(false);
  });

  it('sends at most the cap of columns, and leaves out evidence about the others', () => {
    const headers = Array.from(
      { length: MAX_COLUMNS_PER_PAIR + 5 },
      (_, index) => `c${index}`
    );
    const row = headers.map((_, index) => `v${index}`).join(',');
    const wide = toDataset(headers.join(','), row, row);

    const [request] = buildConfirmDuplicatesRequests({
      dataset: wide,
      candidates: [
        {
          ...candidate(0, 1),
          evidence: {
            nameSimilarity: null,
            agreeingColumns: [
              toColumnKey(0),
              toColumnKey(MAX_COLUMNS_PER_PAIR + 2),
            ],
            sharedIdentifierColumns: [toColumnKey(MAX_COLUMNS_PER_PAIR + 1)],
          },
        },
      ],
    });

    expect(request?.columns).toHaveLength(MAX_COLUMNS_PER_PAIR);
    expect(request?.pairs[0]?.first).toHaveLength(MAX_COLUMNS_PER_PAIR);
    expect(request?.pairs[0]?.evidence).toEqual({
      nameSimilarity: null,
      agreeingColumns: [0],
      sharedIdentifierColumns: [],
    });
  });
});
