import { describe, expect, it } from 'vitest';
import type { AiJob, AiJobState } from './aiJob';
import { summarizeAiTasks } from './summarizeAiTasks';

function jobs(...states: AiJobState[]): AiJob[] {
  return states.map((state, index) => ({
    key: `normalizeValues:${index}`,
    request: {
      task: 'normalizeValues',
      request: {
        column: { key: index, header: `c${index}`, dominantType: 'text' },
        values: [],
        isComplete: true,
      },
    },
    state,
  }));
}

const queued: AiJobState = { status: 'queued' };
const running: AiJobState = { status: 'running' };
const done: AiJobState = { status: 'done' };
const failed = (reason: 'rateLimited' | 'timeout'): AiJobState => ({
  status: 'failed',
  reason,
});

describe('summarizeAiTasks', () => {
  it('has no entry when there are no jobs', () => {
    expect(summarizeAiTasks([])).toEqual([]);
  });

  it('is queued while nothing has started', () => {
    expect(summarizeAiTasks(jobs(queued, queued))).toEqual([
      { task: 'normalizeValues', total: 2, settled: 0, status: 'queued' },
    ]);
  });

  it('is running while a request runs or some are left, counting those that settled', () => {
    expect(summarizeAiTasks(jobs(done, running, queued))).toEqual([
      { task: 'normalizeValues', total: 3, settled: 1, status: 'running' },
    ]);
    expect(summarizeAiTasks(jobs(done, queued))).toMatchObject([
      { status: 'running', settled: 1 },
    ]);
  });

  it('is done once every request is done', () => {
    expect(summarizeAiTasks(jobs(done, done))).toEqual([
      { task: 'normalizeValues', total: 2, settled: 2, status: 'done' },
    ]);
  });

  it('is failed, with the first reason and the count, once all have settled and some failed', () => {
    expect(
      summarizeAiTasks(jobs(done, failed('rateLimited'), failed('timeout')))
    ).toEqual([
      {
        task: 'normalizeValues',
        total: 3,
        settled: 3,
        status: 'failed',
        reason: 'rateLimited',
        failedCount: 2,
      },
    ]);
  });

  it('stays running, not failed, while other requests of the task are still going', () => {
    expect(summarizeAiTasks(jobs(failed('timeout'), running))).toMatchObject([
      { status: 'running', settled: 1 },
    ]);
  });
});
