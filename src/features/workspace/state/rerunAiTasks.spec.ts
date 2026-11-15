import { CancelablePromise } from 'easy-cancelable-promise';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AiRequests } from '@/ai/aiRequests';
import { toColumnKey } from '@/engine/dataset/toColumnKey';
import { toIssueId } from '@/engine/issues/toIssueId';
import { makeIssue } from '../testing/makeIssue';
import { seedIssues } from '../testing/seedIssues';
import type { AiCallEntry } from './aiCallEntry';
import { aiActions, aiStore$ } from './aiStore';
import { reviewActions, reviewStore$ } from './reviewStore';
import { toRunId } from './runId';
import { rerunAiTasks } from './rerunAiTasks';
import { settingsActions } from './settingsStore';

const { worker } = vi.hoisted(() => ({
  worker: { buildAiRequests: vi.fn(), preview: vi.fn() },
}));

vi.mock('@/workers/getDatasetWorker', () => ({
  getDatasetWorker: () => worker,
}));

const noRequests: AiRequests = {
  normalizeValues: [],
  confirmDuplicates: [],
  assessSuspiciousRows: [],
};

const checkIssue = makeIssue({
  id: 'whitespace:0',
  column: toColumnKey(0),
  suggestion: { kind: 'trimWhitespace', column: toColumnKey(0) },
});
const aiIssue = {
  ...makeIssue({
    id: 'normalize-values:1:0',
    column: toColumnKey(1),
    suggestion: {
      kind: 'mapValues',
      column: toColumnKey(1),
      groups: [{ canonical: 'CA', variants: ['Calif.'] }],
    },
  }),
  source: 'ai' as const,
};
const earlierCall: AiCallEntry = {
  key: 'earlier',
  runId: toRunId(1),
  task: 'normalizeValues',
  model: 'anthropic/claude-haiku-5.5',
  requestBody: '{}',
  outcome: 'ok',
  records: [],
  claimCount: 4,
  droppedClaims: 0,
};

describe('rerunAiTasks', () => {
  beforeEach(() => {
    worker.buildAiRequests.mockReset();
    worker.buildAiRequests.mockReturnValue(
      CancelablePromise.resolve(noRequests)
    );
    worker.preview.mockReset();
    worker.preview.mockReturnValue(CancelablePromise.resolve(null));
    seedIssues({
      lines: ['name,state', ' Ada ,Calif.', 'Bo,CA'],
      issues: [checkIssue],
    });
    aiActions.reset();
    aiStore$.setState((state) => ({
      ...state,
      issues: [aiIssue],
      calls: [earlierCall],
    }));
  });

  it('replaces the AI issues and forgets the decisions made on them, keeping the decisions on check issues', async () => {
    reviewActions.accept(checkIssue.id);
    reviewActions.accept(aiIssue.id);
    expect(reviewStore$.getState().decisions.size).toBe(2);

    await rerunAiTasks();

    const { decisions } = reviewStore$.getState();
    expect(decisions.get(checkIssue.id)).toEqual({ status: 'accepted' });
    expect(decisions.has(aiIssue.id)).toBe(false);
    expect(aiStore$.getState().issues).toEqual([]);
  });

  it('keeps the calls of the earlier run, labeled by their model', async () => {
    await rerunAiTasks();

    expect(aiStore$.getState().calls).toEqual([earlierCall]);
  });

  it('clears the selection when the selected issue was an AI issue, and keeps it when it was a check issue', async () => {
    reviewActions.select(aiIssue.id);
    await rerunAiTasks();
    expect(reviewStore$.getState().selectedIssueId).toBeNull();

    reviewActions.select(checkIssue.id);
    await rerunAiTasks();
    expect(reviewStore$.getState().selectedIssueId).toBe(checkIssue.id);
  });

  it('runs with the model that is selected when it starts', async () => {
    settingsActions.selectModel('google/gemini-2.5-flash-lite');
    worker.buildAiRequests.mockReturnValue(
      CancelablePromise.resolve({
        ...noRequests,
        normalizeValues: [
          {
            column: { key: 1, header: 'state', dominantType: 'text' },
            values: [
              { value: 'CA', count: 1 },
              { value: 'Calif.', count: 1 },
            ],
            isComplete: true,
          },
        ],
      })
    );
    const fetchMock = vi.fn(
      async (_url: string, init: RequestInit) =>
        new Response(init.body ? '{}' : '', { status: 502 })
    );
    vi.stubGlobal('fetch', fetchMock);

    await rerunAiTasks();

    expect(aiStore$.getState().run?.model).toBe('google/gemini-2.5-flash-lite');
    const body = fetchMock.mock.calls[0]?.[1].body;
    expect(JSON.parse(String(body)).model).toBe('google/gemini-2.5-flash-lite');
    vi.unstubAllGlobals();
    settingsActions.selectModel('anthropic/claude-haiku-5.5');
  });
});

describe('forgetDecisions', () => {
  beforeEach(() => {
    seedIssues({
      lines: ['name', 'Ada'],
      issues: [checkIssue, makeIssue({ id: 'other:0' })],
    });
  });

  it('drops only the named decisions', () => {
    reviewActions.accept(checkIssue.id);
    reviewActions.reject(toIssueId('other:0'));

    reviewActions.forgetDecisions([toIssueId('other:0')]);

    const { decisions } = reviewStore$.getState();
    expect([...decisions.keys()]).toEqual([checkIssue.id]);
  });
});
