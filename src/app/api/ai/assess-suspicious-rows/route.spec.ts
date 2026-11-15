import { afterEach, describe, expect, it, vi } from 'vitest';
import { maxDuration, POST } from './route';

function post(body: unknown): Request {
  return new Request('http://localhost/api/ai/assess-suspicious-rows', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const column = {
  header: 'amount',
  type: 'decimal',
  distinctCount: 3,
  blankCount: 0,
  range: null,
  topValues: [],
};
const row = { id: 0, rowId: 0, flaggedBy: [], cells: ['1'] };

describe('POST /api/ai/assess-suspicious-rows', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('declares how long it may run', () => {
    expect(maxDuration).toBe(60);
  });

  it('answers 400 invalidRequest to no rows, or more rows than the caps allow', async () => {
    const empty = await POST(
      post({
        model: 'anthropic/claude-haiku-5.5',
        request: { columns: [column], rows: [], isComplete: true },
      })
    );
    const tooMany = await POST(
      post({
        model: 'anthropic/claude-haiku-5.5',
        request: {
          columns: [column],
          rows: Array.from({ length: 81 }, (_, id) => ({ ...row, id })),
          isComplete: false,
        },
      })
    );

    expect(empty.status).toBe(400);
    expect(tooMany.status).toBe(400);
  });

  it('answers 503 aiNotConfigured when there is no key', async () => {
    vi.stubEnv('OPENROUTER_API_KEY', '');

    const response = await POST(
      post({
        model: 'anthropic/claude-haiku-5.5',
        request: { columns: [column], rows: [row], isComplete: true },
      })
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ reason: 'aiNotConfigured' });
  });
});
