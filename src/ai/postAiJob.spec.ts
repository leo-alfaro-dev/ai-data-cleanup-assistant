import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AiJobRequest } from './aiJobRequest';
import { postAiJob } from './postAiJob';

const job: AiJobRequest = {
  task: 'normalizeValues',
  request: {
    column: { key: 1, header: 'state', dominantType: 'text' },
    values: [
      { value: 'CA', count: 2 },
      { value: 'Calif.', count: 1 },
    ],
    isComplete: true,
  },
};
const call = {
  task: 'normalizeValues',
  model: 'anthropic/claude-haiku-5.5',
  promptTokens: 10,
  completionTokens: 5,
  totalTokens: 15,
  cost: 0.0001,
  latencyMs: 20,
  outcome: 'valid',
};
const result = {
  column: job.request.column,
  groups: [],
  placeholders: [],
  claimCount: 0,
  droppedClaims: 0,
};

function answerWith(body: unknown, status = 200) {
  const fetchMock = vi.fn<typeof fetch>(async () =>
    typeof body === 'string'
      ? new Response(body, { status })
      : Response.json(body, { status })
  );
  vi.stubGlobal('fetch', fetchMock);

  return fetchMock;
}

function post() {
  return postAiJob({
    job,
    model: 'anthropic/claude-haiku-5.5',
    signal: new AbortController().signal,
  });
}

describe('postAiJob', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts the model and the request as JSON to the route of the task, and returns the exact body it sent', async () => {
    const fetchMock = answerWith({ ok: true, result, calls: [call] });

    const { body } = await post();

    const [path, init] = fetchMock.mock.calls[0] ?? [];
    expect(path).toBe('/api/ai/normalize-values');
    expect(init).toMatchObject({ method: 'POST', body });
    expect(JSON.parse(body)).toEqual({
      model: 'anthropic/claude-haiku-5.5',
      request: job.request,
    });
  });

  it('returns the result read with the contract of its task, and the calls', async () => {
    answerWith({ ok: true, result, calls: [call] });

    const { outcome } = await post();

    expect(outcome).toEqual({
      ok: true,
      taskResult: { task: 'normalizeValues', result },
      calls: [call],
    });
  });

  it('returns the reason a route gave, with the calls it made', async () => {
    answerWith({ ok: false, reason: 'budgetExhausted', calls: [call] }, 402);

    const { outcome } = await post();

    expect(outcome).toEqual({
      ok: false,
      reason: 'budgetExhausted',
      calls: [call],
    });
  });

  it('fails as unexpected, keeping the calls, when the result does not match the contract', async () => {
    answerWith({ ok: true, result: { groups: 'none' }, calls: [call] });

    const { outcome } = await post();

    expect(outcome).toEqual({ ok: false, reason: 'unexpected', calls: [call] });
  });

  it.each([
    ['a body that is not JSON', 'Bad gateway', 502, 'unexpected'],
    ['a gateway timeout page', '<html>', 504, 'timeout'],
    ['a rate limit page', '<html>', 429, 'rateLimited'],
    ['an envelope that is not ours', '{"ok":"maybe"}', 200, 'unexpected'],
    [
      'a call record that is not ours',
      JSON.stringify({ ok: false, reason: 'timeout', calls: [{ nope: 1 }] }),
      200,
      'unexpected',
    ],
  ])('reads %s by its status', async (_name, text, status, reason) => {
    answerWith(text, status);

    const { outcome } = await post();

    expect(outcome).toEqual({ ok: false, reason, calls: [] });
  });

  it('fails as unexpected when the request cannot be sent, and does not throw', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      })
    );

    const { outcome } = await post();

    expect(outcome).toEqual({ ok: false, reason: 'unexpected', calls: [] });
  });
});
