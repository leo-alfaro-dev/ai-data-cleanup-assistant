import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import type { AiClient } from './aiClient';
import { createAiRoute } from './createAiRoute';
import { createRateLimiter } from './rateLimiter';
import type { AiTaskOutcome } from './aiTaskOutcome';

const requestSchema = z.object({ text: z.string() });
const client: AiClient = {
  createChatCompletion: vi.fn(),
};
const MODEL = 'anthropic/claude-haiku-5.5';

function makeRoute({
  outcome,
  run,
  limit = 1000,
}: {
  limit?: number;
  outcome?: AiTaskOutcome<{ answer: string }>;
  run?: (args: {
    signal: AbortSignal;
  }) => Promise<AiTaskOutcome<{ answer: string }>>;
} = {}) {
  const createClient = vi.fn(() => client);
  const runTask = vi.fn(
    run ??
      (async () =>
        outcome ?? { ok: true as const, result: { answer: 'yes' }, calls: [] })
  );
  const route = createAiRoute({
    task: 'testTask',
    requestSchema,
    run: runTask,
    createClient,
    rateLimiter: createRateLimiter({ limit, windowMs: 60_000 }),
  });

  return { route, createClient, runTask };
}

function post({
  body,
  headers = {},
  signal,
}: {
  body: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}): Request {
  return new Request('http://localhost/api/ai/test', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
    signal,
  });
}

describe('createAiRoute', () => {
  beforeEach(() => {
    vi.stubEnv('OPENROUTER_API_KEY', 'hosted-key');
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('answers 400 invalidRequest to a body that is not JSON', async () => {
    const { route, runTask } = makeRoute();

    const response = await route(post({ body: '{not json' }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      reason: 'invalidRequest',
      calls: [],
    });
    expect(runTask).not.toHaveBeenCalled();
  });

  it.each([
    [
      'a request that breaks the contract',
      { model: MODEL, request: { text: 5 } },
    ],
    [
      'a model that is not offered',
      { model: 'not/offered', request: { text: 'a' } },
    ],
    ['a missing request', { model: MODEL }],
  ])('answers 400 invalidRequest to %s', async (_name, body) => {
    const { route, runTask } = makeRoute();

    const response = await route(post({ body }));

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ reason: 'invalidRequest' });
    expect(runTask).not.toHaveBeenCalled();
  });

  it('answers 503 aiNotConfigured when there is no key at all', async () => {
    vi.stubEnv('OPENROUTER_API_KEY', '');
    const { route, runTask } = makeRoute();

    const response = await route(
      post({ body: { model: MODEL, request: { text: 'a' } } })
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ reason: 'aiNotConfigured' });
    expect(runTask).not.toHaveBeenCalled();
  });

  it('runs the task with the hosted key, the model and the validated request', async () => {
    const { route, createClient, runTask } = makeRoute();

    const response = await route(
      post({ body: { model: MODEL, request: { text: 'a' } } })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      result: { answer: 'yes' },
      calls: [],
    });
    expect(createClient).toHaveBeenCalledWith({ apiKey: 'hosted-key' });
    expect(runTask).toHaveBeenCalledWith({
      client,
      model: MODEL,
      request: { text: 'a' },
      signal: expect.any(AbortSignal),
    });
  });

  it('uses the visitor key from the header instead of the hosted key, and never answers with it', async () => {
    const { route, createClient } = makeRoute();

    const response = await route(
      post({
        body: { model: MODEL, request: { text: 'a' } },
        headers: { 'x-openrouter-key': '  visitor-secret  ' },
      })
    );

    expect(createClient).toHaveBeenCalledWith({ apiKey: 'visitor-secret' });
    expect(await response.text()).not.toContain('visitor-secret');
  });

  it('never passes the visitor key to a log call, whether the task answers or throws', async () => {
    const logs = [
      vi.spyOn(console, 'info').mockImplementation(() => {}),
      vi.spyOn(console, 'warn').mockImplementation(() => {}),
      vi.spyOn(console, 'log').mockImplementation(() => {}),
      vi.mocked(console.error),
    ];
    const headers = { 'x-openrouter-key': 'visitor-secret' };
    const body = { model: MODEL, request: { text: 'a' } };
    const failing = makeRoute({
      run: async () => {
        throw new Error('visitor-secret');
      },
    });

    await makeRoute().route(post({ body, headers }));
    await failing.route(post({ body, headers }));

    expect(logs[3]).toHaveBeenCalled();
    expect(JSON.stringify(logs.flatMap((log) => log.mock.calls))).not.toContain(
      'visitor-secret'
    );
  });

  it('works with the visitor key when the server has none', async () => {
    vi.stubEnv('OPENROUTER_API_KEY', '');
    const { route, createClient } = makeRoute();

    const response = await route(
      post({
        body: { model: MODEL, request: { text: 'a' } },
        headers: { 'x-openrouter-key': 'visitor-secret' },
      })
    );

    expect(response.status).toBe(200);
    expect(createClient).toHaveBeenCalledWith({ apiKey: 'visitor-secret' });
  });

  it.each([
    ['invalidKey', 401],
    ['budgetExhausted', 402],
    ['rateLimited', 429],
    ['modelUnavailable', 502],
    ['timeout', 504],
    ['invalidModelOutput', 502],
    ['unexpected', 500],
  ] as const)(
    'answers a failed task with its reason %s and status %i, keeping its calls',
    async (reason, status) => {
      const calls = [
        {
          task: 'testTask',
          model: MODEL,
          promptTokens: 1,
          completionTokens: 1,
          totalTokens: 2,
          cost: 0.1,
          latencyMs: 5,
          outcome: reason,
        },
      ];
      const { route } = makeRoute({ outcome: { ok: false, reason, calls } });

      const response = await route(
        post({ body: { model: MODEL, request: { text: 'a' } } })
      );

      expect(response.status).toBe(status);
      expect(await response.json()).toEqual({ ok: false, reason, calls });
    }
  );

  it('answers 500 unexpected, with no message, when the task throws', async () => {
    const { route } = makeRoute({
      run: async () => {
        throw new Error('secret detail');
      },
    });

    const response = await route(
      post({ body: { model: MODEL, request: { text: 'a' } } })
    );

    expect(response.status).toBe(500);
    const text = await response.text();
    expect(JSON.parse(text)).toMatchObject({ reason: 'unexpected' });
    expect(text).not.toContain('secret detail');
  });

  it('hands the very signal of the request to the task, so an abort reaches the call', async () => {
    const { route, runTask } = makeRoute();
    const request = post({ body: { model: MODEL, request: { text: 'a' } } });

    await route(request);

    expect(runTask.mock.calls[0]?.[0].signal).toBe(request.signal);
  });

  it('passes the abort signal of the request to the task, and answers 499 when it was aborted', async () => {
    const controller = new AbortController();
    const { route, runTask } = makeRoute({
      run: async () => {
        controller.abort();
        throw new DOMException('aborted', 'AbortError');
      },
    });

    const response = await route(
      post({
        body: { model: MODEL, request: { text: 'a' } },
        signal: controller.signal,
      })
    );

    expect(response.status).toBe(499);
    expect(runTask).toHaveBeenCalledOnce();
  });

  describe('the rate limit on the hosted key', () => {
    const body = { model: MODEL, request: { text: 'a' } };

    it('answers 429 rateLimited past the limit, per visitor address, without running the task', async () => {
      const { route, runTask } = makeRoute({ limit: 1 });
      const visitor = { 'x-forwarded-for': '203.0.113.7' };
      await route(post({ body, headers: visitor }));

      const refused = await route(post({ body, headers: visitor }));
      const other = await route(
        post({ body, headers: { 'x-forwarded-for': '203.0.113.8' } })
      );

      expect(refused.status).toBe(429);
      expect(await refused.json()).toEqual({
        ok: false,
        reason: 'rateLimited',
        calls: [],
      });
      expect(other.status).toBe(200);
      expect(runTask).toHaveBeenCalledTimes(2);
    });

    it('does not count or refuse calls made on the visitor key', async () => {
      const { route, runTask } = makeRoute({ limit: 1 });
      const headers = { 'x-openrouter-key': 'visitor-secret' };

      const statuses = [
        (await route(post({ body, headers }))).status,
        (await route(post({ body, headers }))).status,
        (await route(post({ body }))).status,
      ];

      expect(statuses).toEqual([200, 200, 200]);
      expect(runTask).toHaveBeenCalledTimes(3);
    });

    it('does not count a request the contract refused', async () => {
      const { route } = makeRoute({ limit: 1 });
      await route(post({ body: { model: MODEL } }));

      const response = await route(post({ body }));

      expect(response.status).toBe(200);
    });
  });
});
