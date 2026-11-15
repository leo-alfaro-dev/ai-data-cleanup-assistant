import type { AnalysisStage } from './analysisStage';

// The steps are profiling, one per check, and the near-duplicate search. The stage is the one that
// runs next, so the label never describes work that is already done.
export function toAnalysisProgress({
  completed,
  checkCount,
}: {
  completed: number;
  checkCount: number;
}): { percentage: number; stage: AnalysisStage } {
  const stepCount = checkCount + 2;
  const stage: AnalysisStage = (() => {
    if (completed === 0) return 'profiling';

    return completed <= checkCount ? 'checking' : 'matching';
  })();

  return { percentage: (completed / stepCount) * 100, stage };
}
