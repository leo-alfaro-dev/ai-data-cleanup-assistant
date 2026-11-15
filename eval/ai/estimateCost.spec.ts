import { describe, expect, it } from 'vitest';
import { estimateCost } from './estimateCost';

const prices = { promptPerToken: 0.000001, completionPerToken: 0.00001 };

const job = ({
  content,
  maxTokens,
  replySchemaCharacters = 0,
}: {
  content: string;
  maxTokens: number;
  replySchemaCharacters?: number;
}) => ({
  messages: [{ role: 'user' as const, content }],
  maxTokens,
  replySchemaCharacters,
});

describe('estimateCost', () => {
  it('counts one call per job, and two at most', () => {
    const estimate = estimateCost({
      jobs: [
        job({ content: 'x', maxTokens: 10 }),
        job({ content: 'y', maxTokens: 10 }),
      ],
      prices,
    });

    expect(estimate.minimumCalls).toBe(2);
    expect(estimate.maximumCalls).toBe(4);
  });

  it('bounds the cost by a full reply that is retried once, with the schema and the correction', () => {
    const { ceiling, promptTokens } = estimateCost({
      jobs: [
        job({
          content: 'a'.repeat(240),
          maxTokens: 1_000,
          replySchemaCharacters: 60,
        }),
      ],
      prices,
    });

    expect(promptTokens).toBe(100);
    // Attempt 1: 100 prompt tokens. Attempt 2: 100 + 1,000 reply + 334 correction. Two full replies.
    expect(ceiling).toBeCloseTo(0.000001 * (100 + 1_434) + 0.00001 * 2_000, 10);
  });

  it('costs nothing for no jobs', () => {
    expect(estimateCost({ jobs: [], prices }).ceiling).toBe(0);
  });
});
