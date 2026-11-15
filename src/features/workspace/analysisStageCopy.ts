import type { AnalysisStage } from '@/workers/analysisStage';

export const analysisStageCopy: Record<AnalysisStage, string> = {
  profiling: 'Profiling columns',
  checking: 'Running checks',
  matching: 'Looking for near-duplicates',
};
