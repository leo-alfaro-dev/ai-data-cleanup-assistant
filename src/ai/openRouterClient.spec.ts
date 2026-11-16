import { describe, expect, it, vi } from 'vitest';
import { createOpenRouterClient } from './openRouterClient';
import { toAiFailureReason } from './toAiFailureReason';

const TEST_KEY = 'test-key-not-real';

function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}

function clientWith(fetchMock: typeof fetch) {
  return createOpenRouterClient({ apiKey: TEST_KEY, fetch: fetchMock });
}

describe('createOpenRouterClient', () => {
  it('posts the body as JSON to the chat completions route of OpenRouter, with the key and the app name', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      jsonResponse({ choices: [{ message: { content: '{}' } }] })
    );

    const answer = await clientWith(fetchMock).createChatCompletion({
      body: { model: 'm', messages: [] },
      timeoutMs: 1000,
    });

    expect(answer).toEqual({
      ok: true,
      reply: { choices: [{ message: { content: '{}' } }] },
    });
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual({
      model: 'm',
      messages: [],
    });
    const headers = new Headers(init?.headers);
    expect(headers.get('authorization')).toBe(`Bearer ${TEST_KEY}`);
    expect(headers.get('x-title')).toBe('AI Data Cleanup Assistant');
  });

  it('reads a spent key limit as a budget failure, from the body OpenRouter sends', async () => {
    const body = {
      error: {
        code: 403,
        message: 'Budget limit exceeded',
        metadata: { limit_source: 'openrouter_key_limit' },
      },
    };
    const fetchMock = vi.fn<typeof fetch>(async () => jsonResponse(body, 403));

    const answer = await clientWith(fetchMock).createChatCompletion({
      body: {},
      timeoutMs: 1000,
    });

    expect(answer.ok).toBe(false);
    if (answer.ok || answer.failure.kind === 'aborted')
      throw new Error('Expected a failure');
    expect(answer.failure).toMatchObject({ kind: 'http', status: 403 });
    expect(toAiFailureReason(answer.failure)).toBe('budgetExhausted');
  });

  it('reads a guardrail block, a 403 with no limit named, as unexpected', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      jsonResponse(
        {
          error: {
            code: 403,
            message: 'Request blocked',
            metadata: { patterns: [] },
          },
        },
        403
      )
    );

    const answer = await clientWith(fetchMock).createChatCompletion({
      body: {},
      timeoutMs: 1000,
    });

    if (answer.ok || answer.failure.kind === 'aborted')
      throw new Error('Expected a failure');
    expect(toAiFailureReason(answer.failure)).toBe('unexpected');
  });

  it.each([
    [401, 'invalidKey'],
    [402, 'budgetExhausted'],
    [429, 'providerRateLimited'],
    [502, 'modelUnavailable'],
    [500, 'unexpected'],
  ])(
    'maps a %i from the provider to %s and asks only once, since the SDK does not retry',
    async (status, reason) => {
      const fetchMock = vi.fn<typeof fetch>(async () =>
        jsonResponse({ error: { code: status, message: 'No.' } }, status)
      );

      const answer = await clientWith(fetchMock).createChatCompletion({
        body: {},
        timeoutMs: 1000,
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      if (answer.ok || answer.failure.kind === 'aborted')
        throw new Error('Expected a failure');
      expect(toAiFailureReason(answer.failure)).toBe(reason);
    }
  );

  it('reports a call that outlasts its timeout as a timeout, and asks only once', async () => {
    const fetchMock = vi.fn<typeof fetch>(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('The operation was aborted.', 'AbortError'))
          );
        })
    );

    const answer = await clientWith(fetchMock).createChatCompletion({
      body: {},
      timeoutMs: 20,
    });

    expect(answer).toEqual({ ok: false, failure: { kind: 'timeout' } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('reports a call the caller aborted as aborted, not as a timeout', async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn<typeof fetch>(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('The operation was aborted.', 'AbortError'))
          );
        })
    );

    const pending = clientWith(fetchMock).createChatCompletion({
      body: {},
      signal: controller.signal,
      timeoutMs: 5000,
    });
    await Promise.resolve();
    controller.abort();

    expect(await pending).toEqual({ ok: false, failure: { kind: 'aborted' } });
  });

  it('reports a network failure', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => {
      throw new TypeError('fetch failed');
    });

    const answer = await clientWith(fetchMock).createChatCompletion({
      body: {},
      timeoutMs: 1000,
    });

    expect(answer).toEqual({ ok: false, failure: { kind: 'network' } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
