import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { runStructuredCompletion } from './runStructuredCompletion';
import { completionOf, createFakeAiClient } from './testing/fakeAiClient';

const schema = z.object({ groups: z.array(z.string()) });
const messages = [
  { role: 'system' as const, content: 'You group values.' },
  { role: 'user' as const, content: 'DATA: CA, Calif.' },
];

function run(
  client: ReturnType<typeof createFakeAiClient>['client'],
  options: {
    signal?: AbortSignal;
    deadlineMs?: number;
    now?: () => number;
  } = {}
) {
  return runStructuredCompletion({
    client,
    task: 'normalizeValues',
    model: 'test/model',
    messages,
    schema,
    schemaName: 'normalize_values',
    maxTokens: 4_000,
    now: clock(),
    ...options,
  });
}

describe('runStructuredCompletion', () => {
  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('asks for JSON that matches the schema and returns the validated value', async () => {
    const { client, requests } = createFakeAiClient({
      reply: completionOf({ content: '{"groups":["CA"]}' }),
    });

    const result = await run(client);

    expect(result).toMatchObject({ ok: true, value: { groups: ['CA'] } });
    const [body] = requests();
    expect(body).not.toHaveProperty('temperature');
    expect(body).toMatchObject({
      model: 'test/model',
      messages,
      max_tokens: 4_000,
      provider: { require_parameters: true },
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'normalize_values',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              groups: { type: 'array', items: { type: 'string' } },
            },
            required: ['groups'],
            additionalProperties: false,
          },
        },
      },
    });
  });

  it('hands the signal it was given to the client', async () => {
    const controller = new AbortController();
    const { client, createChatCompletion } = createFakeAiClient({
      reply: completionOf({ content: '{"groups":[]}' }),
    });

    await run(client, { signal: controller.signal });

    expect(createChatCompletion.mock.calls[0]?.[0].signal).toBe(
      controller.signal
    );
  });

  it('records the usage of the call, with its cost and latency', async () => {
    const { client } = createFakeAiClient({
      reply: completionOf({ content: '{"groups":[]}' }),
    });

    const result = await run(client);

    expect(result.calls).toEqual([
      {
        task: 'normalizeValues',
        model: 'test/model',
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15,
        cost: 0.0001,
        latencyMs: 25,
        outcome: 'valid',
      },
    ]);
  });

  it('records zero tokens and no cost when the reply carries no usage', async () => {
    const { client } = createFakeAiClient({
      reply: completionOf({ content: '{"groups":[]}', usage: null }),
    });

    const result = await run(client);

    expect(result.calls[0]).toMatchObject({
      promptTokens: 0,
      totalTokens: 0,
      cost: null,
    });
  });

  it('retries once on an invalid reply, quoting the problem, and succeeds on the second', async () => {
    const { client, requests, createChatCompletion } = createFakeAiClient(
      { reply: completionOf({ content: '{"groups":"CA"}' }) },
      { reply: completionOf({ content: '{"groups":["CA"]}' }) }
    );

    const result = await run(client);

    expect(createChatCompletion).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ ok: true, value: { groups: ['CA'] } });
    expect(result.calls.map(({ outcome }) => outcome)).toEqual([
      'invalidModelOutput',
      'valid',
    ]);
    const retryMessages = requests()[1]?.messages;
    expect(retryMessages).toEqual([
      ...messages,
      { role: 'assistant', content: '{"groups":"CA"}' },
      {
        role: 'user',
        content: expect.stringContaining('groups: Invalid input'),
      },
    ]);
  });

  it('retries a reply that is not JSON', async () => {
    const { client, createChatCompletion } = createFakeAiClient(
      { reply: completionOf({ content: 'Sure! Here you go.' }) },
      { reply: completionOf({ content: '{"groups":[]}' }) }
    );

    const result = await run(client);

    expect(createChatCompletion).toHaveBeenCalledTimes(2);
    expect(result.ok).toBe(true);
  });

  it('fails with invalidModelOutput after two invalid replies, and records both', async () => {
    const { client, createChatCompletion } = createFakeAiClient(
      { reply: completionOf({ content: '{"nope":1}' }) },
      { reply: completionOf({ content: '{"nope":2}' }) }
    );

    const result = await run(client);

    expect(createChatCompletion).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ ok: false, reason: 'invalidModelOutput' });
    expect(result.calls).toHaveLength(2);
    expect(result.calls.every(({ cost }) => cost === 0.0001)).toBe(true);
  });

  it('leaves the empty assistant turn out of the retry', async () => {
    const { client, requests } = createFakeAiClient(
      { reply: completionOf({ content: '' }) },
      { reply: completionOf({ content: '{"groups":[]}' }) }
    );

    await run(client);

    const retryMessages = requests()[1]?.messages;
    expect(retryMessages).toEqual([
      ...messages,
      { role: 'user', content: expect.stringContaining('did not match') },
    ]);
  });

  it('gives each attempt only the time the deadline has left', async () => {
    let time = 0;
    const { client, createChatCompletion } = createFakeAiClient({
      reply: completionOf({ content: '{"groups":[]}' }),
    });
    createChatCompletion.mockImplementationOnce(async () => {
      time += 20_000;

      return { ok: true, reply: completionOf({ content: '{"nope":1}' }) };
    });

    await run(client, { deadlineMs: 50_000, now: () => time });

    const timeouts = createChatCompletion.mock.calls.map(
      ([request]) => request.timeoutMs
    );
    expect(timeouts).toEqual([50_000, 30_000]);
  });

  it('does not retry when too little of the deadline is left, and fails with invalidModelOutput', async () => {
    let time = 0;
    const { client, createChatCompletion } = createFakeAiClient({
      reply: completionOf({ content: '{"groups":[]}' }),
    });
    createChatCompletion.mockImplementationOnce(async () => {
      time += 48_000;

      return { ok: true, reply: completionOf({ content: '{"nope":1}' }) };
    });

    const result = await run(client, { deadlineMs: 55_000, now: () => time });

    expect(createChatCompletion).toHaveBeenCalledOnce();
    expect(result).toMatchObject({ ok: false, reason: 'invalidModelOutput' });
    expect(result.calls).toHaveLength(1);
  });

  it('treats an empty or missing message as an invalid reply', async () => {
    const { client } = createFakeAiClient(
      { reply: { choices: [] } },
      { reply: completionOf({ content: '' }) }
    );

    const result = await run(client);

    expect(result).toMatchObject({ ok: false, reason: 'invalidModelOutput' });
  });

  it.each([
    [401, 'invalidKey'],
    [402, 'budgetExhausted'],
    [429, 'providerRateLimited'],
    [503, 'modelUnavailable'],
    [500, 'unexpected'],
  ])(
    'fails with the reason of status %i and does not retry',
    async (status, reason) => {
      const { client, createChatCompletion } = createFakeAiClient({
        failure: { kind: 'http', status, payload: {} },
      });

      const result = await run(client);

      expect(createChatCompletion).toHaveBeenCalledOnce();
      expect(result).toMatchObject({ ok: false, reason });
      expect(result.calls).toMatchObject([{ outcome: reason, totalTokens: 0 }]);
    }
  );

  it('fails with timeout on a timeout, without retrying', async () => {
    const { client, createChatCompletion } = createFakeAiClient({
      failure: { kind: 'timeout' },
    });

    const result = await run(client);

    expect(createChatCompletion).toHaveBeenCalledOnce();
    expect(result).toMatchObject({ ok: false, reason: 'timeout' });
  });

  it('maps an error that arrives in the body of a 200 reply', async () => {
    const { client } = createFakeAiClient({
      reply: { error: { code: 429, message: 'Provider returned error' } },
    });

    const result = await run(client);

    expect(result).toMatchObject({ ok: false, reason: 'providerRateLimited' });
  });

  it('rejects when the call is aborted, and never retries', async () => {
    const controller = new AbortController();
    const { client, createChatCompletion } = createFakeAiClient({
      failure: { kind: 'aborted' },
    });
    controller.abort(new Error('Run replaced'));

    await expect(run(client, { signal: controller.signal })).rejects.toThrow(
      'Run replaced'
    );
    expect(createChatCompletion).not.toHaveBeenCalled();
  });

  it('rejects an abort that happens during a call without a second attempt', async () => {
    const { client, createChatCompletion } = createFakeAiClient(
      { failure: { kind: 'aborted' } },
      { reply: completionOf({ content: '{"groups":[]}' }) }
    );

    await expect(run(client)).rejects.toThrow('aborted');
    expect(createChatCompletion).toHaveBeenCalledOnce();
  });

  it('logs the task, model, tokens, latency and outcome, and nothing from the prompt or reply', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    const { client } = createFakeAiClient({
      reply: completionOf({ content: '{"groups":["SECRET-CELL"]}' }),
    });

    await run(client);

    const logged = info.mock.calls.flat().join(' ');
    expect(logged).toContain('normalizeValues');
    expect(logged).toContain('test/model');
    expect(logged).toContain('"outcome":"valid"');
    expect(logged).not.toContain('SECRET-CELL');
    expect(logged).not.toContain('DATA: CA');
  });
});

function clock(): () => number {
  let time = 1_000;

  return () => {
    time += 25;

    return time;
  };
}
