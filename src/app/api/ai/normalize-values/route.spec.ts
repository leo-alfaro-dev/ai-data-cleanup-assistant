import { afterEach, describe, expect, it, vi } from 'vitest';
import { maxDuration, POST } from './route';

function post(body: unknown): Request {
  return new Request('http://localhost/api/ai/normalize-values', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/ai/normalize-values', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('declares how long it may run', () => {
    expect(maxDuration).toBe(60);
  });

  it('answers 400 invalidRequest to a body that breaks the contract', async () => {
    const response = await POST(
      post({
        model: 'anthropic/claude-haiku-5.5',
        request: {
          column: { key: 1, header: 'state', dominantType: 'text' },
          values: [],
          isComplete: true,
        },
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ reason: 'invalidRequest' });
  });

  it('answers 400 invalidRequest to a value longer than the cap', async () => {
    const response = await POST(
      post({
        model: 'anthropic/claude-haiku-5.5',
        request: {
          column: { key: 1, header: 'state', dominantType: 'text' },
          values: [
            { value: 'x'.repeat(81), count: 1 },
            { value: 'y', count: 1 },
          ],
          isComplete: true,
        },
      })
    );

    expect(response.status).toBe(400);
  });

  it('answers 503 aiNotConfigured when there is no key', async () => {
    vi.stubEnv('OPENROUTER_API_KEY', '');

    const response = await POST(
      post({
        model: 'anthropic/claude-haiku-5.5',
        request: {
          column: { key: 1, header: 'state', dominantType: 'text' },
          values: [
            { value: 'CA', count: 2 },
            { value: 'Calif.', count: 1 },
          ],
          isComplete: true,
        },
      })
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ reason: 'aiNotConfigured' });
  });
});
