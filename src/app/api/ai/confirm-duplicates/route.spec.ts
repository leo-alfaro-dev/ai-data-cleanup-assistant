import { afterEach, describe, expect, it, vi } from 'vitest';
import { maxDuration, POST } from './route';

function post(body: unknown): Request {
  return new Request('http://localhost/api/ai/confirm-duplicates', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const pair = {
  id: 0,
  rows: [0, 1],
  similarity: 0.9,
  evidence: {
    nameSimilarity: null,
    agreeingColumns: [],
    sharedIdentifierColumns: [],
  },
  first: ['a'],
  second: ['b'],
};

describe('POST /api/ai/confirm-duplicates', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('declares how long it may run', () => {
    expect(maxDuration).toBe(60);
  });

  it('answers 400 invalidRequest to a request with no pairs, or too many', async () => {
    const empty = await POST(
      post({
        model: 'anthropic/claude-haiku-5.5',
        request: { columns: ['a'], pairs: [] },
      })
    );
    const tooMany = await POST(
      post({
        model: 'anthropic/claude-haiku-5.5',
        request: {
          columns: ['a'],
          pairs: Array.from({ length: 31 }, (_, id) => ({ ...pair, id })),
        },
      })
    );

    expect(empty.status).toBe(400);
    expect(tooMany.status).toBe(400);
    expect(await tooMany.json()).toMatchObject({ reason: 'invalidRequest' });
  });

  it('answers 503 aiNotConfigured when there is no key', async () => {
    vi.stubEnv('OPENROUTER_API_KEY', '');

    const response = await POST(
      post({
        model: 'anthropic/claude-haiku-5.5',
        request: { columns: ['a'], pairs: [pair] },
      })
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ reason: 'aiNotConfigured' });
  });
});
