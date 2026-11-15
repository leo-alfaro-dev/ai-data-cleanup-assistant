import { CancelablePromise } from 'easy-cancelable-promise';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AiRequests } from '@/ai/aiRequests';
import type { AiTaskResult } from '@/ai/aiTaskResult';
import type { NormalizeValuesResult } from '@/ai/tasks/normalizeValues/normalizeValuesContract';
import type { NormalizeValuesRequest } from '@/ai/tasks/normalizeValues/normalizeValuesContract';
import type { Issue } from '@/engine/issues/issue';
import { toIssueId } from '@/engine/issues/toIssueId';
import { aiActions, aiStore$ } from './aiStore';
import { settingsActions } from './settingsStore';
import { summarizeAiTasks } from './summarizeAiTasks';

const { worker } = vi.hoisted(() => ({
  worker: {
    buildAiRequests: vi.fn(),
    buildAiIssues: vi.fn(),
  },
}));

vi.mock('@/workers/getDatasetWorker', () => ({
  getDatasetWorker: () => worker,
}));

function request(key: number): NormalizeValuesRequest {
  return {
    column: { key, header: `c${key}`, dominantType: 'text' },
    values: [
      { value: 'CA', count: 2 },
      { value: 'Calif.', count: 1 },
    ],
    isComplete: true,
  };
}

function requests(count: number): AiRequests {
  return {
    normalizeValues: Array.from({ length: count }, (_, index) =>
      request(index)
    ),
    confirmDuplicates: [],
    assessSuspiciousRows: [],
  };
}

function resultOf(key: number): NormalizeValuesResult {
  return {
    column: request(key).column,
    groups: [],
    placeholders: [],
    claimCount: 4,
    droppedClaims: 1,
  };
}

function issueOf(key: number): Issue {
  return {
    id: toIssueId(`normalize-values:${key}:0`),
    category: 'inconsistent',
    source: 'ai',
    confidence: 'high',
    rows: [],
    column: null,
    suggestion: null,
    details: { kind: 'blankRows' },
  };
}

const call = {
  task: 'normalizeValues',
  model: 'anthropic/claude-haiku-5.5',
  promptTokens: 10,
  completionTokens: 5,
  totalTokens: 15,
  cost: 0.001,
  latencyMs: 20,
  outcome: 'valid',
};

function okResponse(key: number): Response {
  return Response.json({ ok: true, result: resultOf(key), calls: [call] });
}

function failedResponse(reason: string, status: number): Response {
  return Response.json({ ok: false, reason, calls: [] }, { status });
}

type Held = {
  resolve: (response: Response) => void;
  key: number;
  signal: AbortSignal;
};

function holdFetch(): { held: Held[]; fetchMock: ReturnType<typeof vi.fn> } {
  const held: Held[] = [];
  const fetchMock = vi.fn(
    (_url: string, init: RequestInit) =>
      new Promise<Response>((resolve) => {
        const body = JSON.parse(String(init.body)) as {
          request: NormalizeValuesRequest;
        };
        held.push({
          resolve,
          key: body.request.column.key,
          signal: init.signal as AbortSignal,
        });
      })
  );
  vi.stubGlobal('fetch', fetchMock);

  return { held, fetchMock };
}

const tick = () => new Promise((resolve) => setTimeout(resolve));

describe('aiStore', () => {
  beforeEach(() => {
    aiActions.reset();
    worker.buildAiRequests.mockReset();
    worker.buildAiIssues.mockReset();
    worker.buildAiIssues.mockImplementation((taskResult: AiTaskResult) =>
      CancelablePromise.resolve({
        issues:
          taskResult.task === 'normalizeValues'
            ? [issueOf(taskResult.result.column.key)]
            : [],
        notes: [],
      })
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('runs every request with the model, lands the issues and records each call as it was sent', async () => {
    worker.buildAiRequests.mockReturnValue(
      CancelablePromise.resolve(requests(2))
    );
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body)) as {
        request: NormalizeValuesRequest;
      };

      return okResponse(body.request.column.key);
    });
    vi.stubGlobal('fetch', fetchMock);

    await aiActions.startRun();

    const state = aiStore$.getState();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/ai/normalize-values');
    expect(state.issues.map(({ id }) => id).sort()).toEqual([
      'normalize-values:0:0',
      'normalize-values:1:0',
    ]);
    expect(summarizeAiTasks(state.run?.jobs ?? [])).toMatchObject([
      { task: 'normalizeValues', status: 'done', total: 2, settled: 2 },
    ]);
    expect(state.calls).toHaveLength(2);
    const [entry] = state.calls;
    expect(entry).toMatchObject({
      task: 'normalizeValues',
      model: 'anthropic/claude-haiku-5.5',
      outcome: 'ok',
      claimCount: 4,
      droppedClaims: 1,
      records: [call],
    });
    expect(entry?.requestBody).toBe(
      JSON.stringify({
        model: 'anthropic/claude-haiku-5.5',
        request: request(0),
      })
    );
  });

  it('never has more than three requests in flight, and sends the next as one answers', async () => {
    worker.buildAiRequests.mockReturnValue(
      CancelablePromise.resolve(requests(6))
    );
    const { held, fetchMock } = holdFetch();

    const running = aiActions.startRun();
    await tick();

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(summarizeAiTasks(aiStore$.getState().run?.jobs ?? [])).toMatchObject(
      [{ status: 'running', settled: 0, total: 6 }]
    );

    held[0]?.resolve(okResponse(held[0].key));
    await tick();

    expect(fetchMock).toHaveBeenCalledTimes(4);

    for (let answered = 1; answered < 6; answered += 1) {
      let entry = held[answered];
      while (entry === undefined) {
        await tick();
        entry = held[answered];
      }
      entry.resolve(okResponse(entry.key));
      await tick();
    }
    await running;

    expect(fetchMock).toHaveBeenCalledTimes(6);
    expect(aiStore$.getState().issues).toHaveLength(6);
  });

  it('lands nothing from a run whose file was replaced while a response was held', async () => {
    worker.buildAiRequests.mockReturnValue(
      CancelablePromise.resolve(requests(1))
    );
    const { held } = holdFetch();

    const running = aiActions.startRun();
    await tick();
    aiActions.reset();
    held[0]?.resolve(okResponse(0));
    await running;
    await tick();

    expect(aiStore$.getState()).toMatchObject({
      run: null,
      issues: [],
      calls: [],
    });
    expect(worker.buildAiIssues).not.toHaveBeenCalled();
  });

  it('aborts the requests in flight when the run is reset', async () => {
    worker.buildAiRequests.mockReturnValue(
      CancelablePromise.resolve(requests(2))
    );
    const { held } = holdFetch();

    const running = aiActions.startRun();
    await tick();
    aiActions.reset();
    held.forEach((entry) => entry.resolve(okResponse(entry.key)));
    await running;

    expect(held.every(({ signal }) => signal.aborted)).toBe(true);
  });

  it('lands nothing from an earlier run once a new run has started', async () => {
    worker.buildAiRequests.mockReturnValue(
      CancelablePromise.resolve(requests(1))
    );
    const { held } = holdFetch();

    const first = aiActions.startRun();
    await tick();
    const second = aiActions.startRun();
    await tick();
    held[0]?.resolve(okResponse(0));
    held[1]?.resolve(okResponse(0));
    await Promise.all([first, second]);

    expect(held[0]?.signal.aborted).toBe(true);
    expect(aiStore$.getState().issues).toHaveLength(1);
    expect(aiStore$.getState().calls).toHaveLength(1);
    const { run } = aiStore$.getState();
    expect(run?.runId).toBeGreaterThan(0);
    expect(
      aiStore$.getState().calls.every((entry) => entry.runId === run?.runId)
    ).toBe(true);
  });

  it('shows the reason of a failed request, and a retry runs only the failed ones', async () => {
    worker.buildAiRequests.mockReturnValue(
      CancelablePromise.resolve(requests(2))
    );
    let attempt = 0;
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body)) as {
        request: NormalizeValuesRequest;
      };
      attempt += 1;
      const shouldFail = body.request.column.key === 1 && attempt <= 2;

      return shouldFail
        ? failedResponse('rateLimited', 429)
        : okResponse(body.request.column.key);
    });
    vi.stubGlobal('fetch', fetchMock);

    await aiActions.startRun();

    expect(summarizeAiTasks(aiStore$.getState().run?.jobs ?? [])).toMatchObject(
      [{ status: 'failed', reason: 'rateLimited', failedCount: 1, settled: 2 }]
    );
    expect(aiStore$.getState().issues).toHaveLength(1);
    expect(
      aiStore$
        .getState()
        .calls.map(({ outcome }) => outcome)
        .sort()
    ).toEqual(['ok', 'rateLimited']);

    await aiActions.retryTask('normalizeValues');

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(summarizeAiTasks(aiStore$.getState().run?.jobs ?? [])).toMatchObject(
      [{ status: 'done' }]
    );
    expect(aiStore$.getState().issues).toHaveLength(2);
    const { calls } = aiStore$.getState();
    expect(calls).toHaveLength(3);
    expect(new Set(calls.map(({ key }) => key)).size).toBe(3);
  });

  it('retries with the model the run started with, not the one picked since', async () => {
    worker.buildAiRequests.mockReturnValue(
      CancelablePromise.resolve(requests(1))
    );
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(failedResponse('timeout', 504))
      .mockResolvedValueOnce(okResponse(0));
    vi.stubGlobal('fetch', fetchMock);
    settingsActions.selectModel('anthropic/claude-haiku-5.5');
    await aiActions.startRun();

    settingsActions.selectModel('google/gemini-2.5-flash-lite');
    await aiActions.retryTask('normalizeValues');

    const models = fetchMock.mock.calls.map(
      ([, init]) => JSON.parse(String(init.body)).model
    );
    expect(models).toEqual([
      'anthropic/claude-haiku-5.5',
      'anthropic/claude-haiku-5.5',
    ]);
    settingsActions.selectModel('anthropic/claude-haiku-5.5');
  });

  it('does not retry a task while any request of the run is still in flight', async () => {
    worker.buildAiRequests.mockReturnValue(
      CancelablePromise.resolve(requests(2))
    );
    const fetchMock = vi.fn(async () => failedResponse('timeout', 504));
    vi.stubGlobal('fetch', fetchMock);
    await aiActions.startRun();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    aiStore$.setState((state) => ({
      ...state,
      run: state.run && {
        ...state.run,
        jobs: state.run.jobs.map((job, index) =>
          index === 0 ? { ...job, state: { status: 'running' } } : job
        ),
      },
    }));

    await aiActions.retryTask('normalizeValues');

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('keeps the check issues alone: a failed request touches nothing but its own task', async () => {
    worker.buildAiRequests.mockReturnValue(
      CancelablePromise.resolve(requests(1))
    );
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => failedResponse('aiNotConfigured', 503))
    );

    await aiActions.startRun();

    expect(aiStore$.getState().issues).toEqual([]);
    expect(summarizeAiTasks(aiStore$.getState().run?.jobs ?? [])).toMatchObject(
      [{ status: 'failed', reason: 'aiNotConfigured' }]
    );
  });

  it('fails a request as unexpected when the network fails or the answer is not ours', async () => {
    worker.buildAiRequests.mockReturnValue(
      CancelablePromise.resolve(requests(2))
    );
    const answers = [
      () => Promise.reject(new TypeError('Failed to fetch')),
      () =>
        Promise.resolve(
          new Response('<html>Bad gateway</html>', { status: 502 })
        ),
    ];
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => answers.shift()?.() ?? okResponse(0))
    );

    await aiActions.startRun();

    expect(aiStore$.getState().calls.map(({ outcome }) => outcome)).toEqual([
      'unexpected',
      'unexpected',
    ]);
  });

  it('reads a gateway timeout or rate limit that is not our answer by its status', async () => {
    worker.buildAiRequests.mockReturnValue(
      CancelablePromise.resolve(requests(2))
    );
    const answers = [
      () => new Response('slow', { status: 504 }),
      () => new Response('slow down', { status: 429 }),
    ];
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => answers.shift()?.() ?? okResponse(0))
    );

    await aiActions.startRun();

    expect(aiStore$.getState().calls.map(({ outcome }) => outcome)).toEqual([
      'timeout',
      'rateLimited',
    ]);
  });

  it('sends nothing for a file with nothing to send', async () => {
    worker.buildAiRequests.mockReturnValue(
      CancelablePromise.resolve(requests(0))
    );
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await aiActions.startRun();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(aiStore$.getState().run?.jobs).toEqual([]);
  });

  it('does nothing when the worker has no file', async () => {
    worker.buildAiRequests.mockReturnValue(CancelablePromise.resolve(null));
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await aiActions.startRun();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(aiStore$.getState().run).toBeNull();
  });

  it('keeps the calls of an earlier run when a new run starts, and replaces its issues', async () => {
    worker.buildAiRequests.mockReturnValue(
      CancelablePromise.resolve(requests(1))
    );
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => okResponse(0))
    );

    await aiActions.startRun();
    await aiActions.startRun();

    const state = aiStore$.getState();
    expect(state.issues).toHaveLength(1);
    expect(state.calls).toHaveLength(2);
    const [first, second] = state.calls;
    expect(second?.runId).toBe((first?.runId ?? 0) + 1);
  });
});
