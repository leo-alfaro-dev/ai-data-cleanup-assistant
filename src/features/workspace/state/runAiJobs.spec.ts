import { describe, expect, it, vi } from 'vitest';
import type { AiJobOutcome } from '@/ai/aiJobOutcome';
import type { NormalizeValuesResult } from '@/ai/tasks/normalizeValues/normalizeValuesContract';
import { toIssueId } from '@/engine/issues/toIssueId';
import type { Issue } from '@/engine/issues/issue';
import type { AiJob } from './aiJob';
import { runAiJobs } from './runAiJobs';

const result: NormalizeValuesResult = {
  column: { key: 1, header: 'state', dominantType: 'text' },
  groups: [],
  placeholders: [],
  claimCount: 0,
  droppedClaims: 0,
};
const okOutcome: AiJobOutcome = {
  ok: true,
  taskResult: { task: 'normalizeValues', result },
  calls: [],
};
const issue: Issue = {
  id: toIssueId('normalize-values:1:0'),
  category: 'inconsistent',
  source: 'ai',
  confidence: 'high',
  rows: [],
  column: null,
  suggestion: null,
  details: { kind: 'blankRows' },
};

function job(index: number): AiJob {
  return {
    key: `normalizeValues:${index}`,
    request: {
      task: 'normalizeValues',
      request: { column: result.column, values: [], isComplete: true },
    },
    state: { status: 'queued' },
  };
}

describe('runAiJobs', () => {
  it('moves a job from running to done and reports its issues and the request body', async () => {
    const onState = vi.fn();
    const onSettled = vi.fn();

    await runAiJobs({
      jobs: [job(0)],
      signal: new AbortController().signal,
      isCurrent: () => true,
      post: async () => ({ body: '{"sent":true}', outcome: okOutcome }),
      buildIssues: async () => ({ issues: [issue], notes: [] }),
      onState,
      onSettled,
    });

    expect(onState.mock.calls.map(([change]) => change.state.status)).toEqual([
      'running',
      'done',
    ]);
    expect(onSettled).toHaveBeenCalledWith({
      job: job(0),
      body: '{"sent":true}',
      outcome: okOutcome,
      issues: [issue],
      notes: [],
    });
  });

  it('reports the issues of a job before it reads as done', async () => {
    const order: string[] = [];

    await runAiJobs({
      jobs: [job(0)],
      signal: new AbortController().signal,
      isCurrent: () => true,
      post: async () => ({ body: '{}', outcome: okOutcome }),
      buildIssues: async () => ({ issues: [issue], notes: [] }),
      onState: ({ state }) => order.push(`state:${state.status}`),
      onSettled: () => order.push('settled'),
    });

    expect(order).toEqual(['state:running', 'settled', 'state:done']);
  });

  it('marks a failed call with its reason and reports it with no issues', async () => {
    const onState = vi.fn();
    const onSettled = vi.fn();
    const failure: AiJobOutcome = {
      ok: false,
      reason: 'rateLimited',
      calls: [],
    };

    await runAiJobs({
      jobs: [job(0)],
      signal: new AbortController().signal,
      isCurrent: () => true,
      post: async () => ({ body: '{}', outcome: failure }),
      buildIssues: async () => ({ issues: [issue], notes: [] }),
      onState,
      onSettled,
    });

    expect(onState).toHaveBeenLastCalledWith({
      key: 'normalizeValues:0',
      state: { status: 'failed', reason: 'rateLimited' },
    });
    expect(onSettled).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: failure, issues: [] })
    );
  });

  it('fails the job as unexpected when the issues cannot be built', async () => {
    const onState = vi.fn();
    const onSettled = vi.fn();

    await runAiJobs({
      jobs: [job(0)],
      signal: new AbortController().signal,
      isCurrent: () => true,
      post: async () => ({ body: '{}', outcome: okOutcome }),
      buildIssues: async () => {
        throw new Error('worker gone');
      },
      onState,
      onSettled,
    });

    expect(onState).toHaveBeenLastCalledWith({
      key: 'normalizeValues:0',
      state: { status: 'failed', reason: 'unexpected' },
    });
    expect(onSettled).toHaveBeenCalledWith(
      expect.objectContaining({ issues: [] })
    );
  });

  it('reports nothing for an answer that arrives after the run stopped being current', async () => {
    let isCurrent = true;
    const onState = vi.fn();
    const onSettled = vi.fn();

    await runAiJobs({
      jobs: [job(0)],
      signal: new AbortController().signal,
      isCurrent: () => isCurrent,
      post: async () => {
        isCurrent = false;

        return { body: '{}', outcome: okOutcome };
      },
      buildIssues: async () => ({ issues: [issue], notes: [] }),
      onState,
      onSettled,
    });

    expect(onState.mock.calls.map(([change]) => change.state.status)).toEqual([
      'running',
    ]);
    expect(onSettled).not.toHaveBeenCalled();
  });

  it('discards the issues of a reply when the run stops being current while they are built', async () => {
    let isCurrent = true;
    const onSettled = vi.fn();

    await runAiJobs({
      jobs: [job(0)],
      signal: new AbortController().signal,
      isCurrent: () => isCurrent,
      post: async () => ({ body: '{}', outcome: okOutcome }),
      buildIssues: async () => {
        isCurrent = false;

        return { issues: [issue], notes: [] };
      },
      onState: vi.fn(),
      onSettled,
    });

    expect(onSettled).not.toHaveBeenCalled();
  });

  it('starts nothing for a run that is already stale', async () => {
    const post = vi.fn();

    await runAiJobs({
      jobs: [job(0), job(1)],
      signal: new AbortController().signal,
      isCurrent: () => false,
      post,
      buildIssues: async () => ({ issues: [], notes: [] }),
      onState: vi.fn(),
      onSettled: vi.fn(),
    });

    expect(post).not.toHaveBeenCalled();
  });
});
