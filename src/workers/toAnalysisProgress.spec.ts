import { describe, expect, it } from 'vitest';
import { toAnalysisProgress } from './toAnalysisProgress';

describe('toAnalysisProgress', () => {
  it('names the stage that runs next as each step finishes', () => {
    const stages = [0, 1, 2, 3, 4].map(
      (completed) => toAnalysisProgress({ completed, checkCount: 3 }).stage
    );

    expect(stages).toEqual([
      'profiling',
      'checking',
      'checking',
      'checking',
      'matching',
    ]);
  });

  it('is on the matching stage once the last check is done, and at 100 once matching is', () => {
    expect(toAnalysisProgress({ completed: 4, checkCount: 3 }).stage).toBe(
      'matching'
    );
    expect(toAnalysisProgress({ completed: 5, checkCount: 3 })).toEqual({
      percentage: 100,
      stage: 'matching',
    });
  });

  it('counts profiling, each check and the matching as equal steps', () => {
    expect(toAnalysisProgress({ completed: 0, checkCount: 3 }).percentage).toBe(
      0
    );
    expect(toAnalysisProgress({ completed: 1, checkCount: 3 }).percentage).toBe(
      20
    );
    expect(toAnalysisProgress({ completed: 3, checkCount: 3 }).percentage).toBe(
      60
    );
  });
});
