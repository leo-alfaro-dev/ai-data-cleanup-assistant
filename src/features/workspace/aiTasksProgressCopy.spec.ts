import { describe, expect, it } from 'vitest';
import { aiTasksProgressCopy } from './aiTasksProgressCopy';
import type { AiTaskSummary } from './state/aiTaskSummary';

const done: AiTaskSummary = {
  task: 'normalizeValues',
  total: 2,
  settled: 2,
  status: 'done',
};
const running: AiTaskSummary = {
  task: 'confirmDuplicates',
  total: 1,
  settled: 0,
  status: 'running',
};
const failed: AiTaskSummary = {
  task: 'assessSuspiciousRows',
  total: 1,
  settled: 1,
  status: 'failed',
  reason: 'timeout',
  failedCount: 1,
};

describe('aiTasksProgressCopy', () => {
  it('counts the tasks that are done out of all of them', () => {
    expect(aiTasksProgressCopy([done, running])).toBe('1 of 2 done');
  });

  it('adds the failed tasks only when one failed', () => {
    expect(aiTasksProgressCopy([done, running, failed])).toBe(
      '1 of 3 done, 1 failed'
    );
  });
});
