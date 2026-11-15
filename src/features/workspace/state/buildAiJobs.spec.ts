import { describe, expect, it } from 'vitest';
import type { NormalizeValuesRequest } from '@/ai/tasks/normalizeValues/normalizeValuesContract';
import { buildAiJobs } from './buildAiJobs';

const request = (key: number): NormalizeValuesRequest => ({
  column: { key, header: `c${key}`, dominantType: 'text' },
  values: [
    { value: 'a', count: 2 },
    { value: 'b', count: 1 },
  ],
  isComplete: true,
});

describe('buildAiJobs', () => {
  it('makes one queued job per request, keyed by task and position', () => {
    const jobs = buildAiJobs({
      normalizeValues: [request(1), request(4)],
      confirmDuplicates: [],
      assessSuspiciousRows: [],
    });

    expect(jobs).toEqual([
      {
        key: 'normalizeValues:0',
        request: { task: 'normalizeValues', request: request(1) },
        state: { status: 'queued' },
      },
      {
        key: 'normalizeValues:1',
        request: { task: 'normalizeValues', request: request(4) },
        state: { status: 'queued' },
      },
    ]);
  });

  it('makes a job for the confirm-duplicates request, after the normalize-values ones', () => {
    const duplicates = {
      columns: ['name'],
      pairs: [
        {
          id: 0,
          rows: [0, 1] as [number, number],
          similarity: 1,
          evidence: {
            nameSimilarity: null,
            agreeingColumns: [],
            sharedIdentifierColumns: [],
          },
          first: ['Ada'],
          second: ['Ada'],
        },
      ],
    };

    const jobs = buildAiJobs({
      normalizeValues: [request(1)],
      confirmDuplicates: [duplicates],
      assessSuspiciousRows: [],
    });

    expect(jobs.map(({ key }) => key)).toEqual([
      'normalizeValues:0',
      'confirmDuplicates:0',
    ]);
    expect(jobs[1]?.request).toEqual({
      task: 'confirmDuplicates',
      request: duplicates,
    });
  });

  it('makes no job for a file with nothing to send', () => {
    expect(
      buildAiJobs({
        normalizeValues: [],
        confirmDuplicates: [],
        assessSuspiciousRows: [],
      })
    ).toEqual([]);
  });
});
