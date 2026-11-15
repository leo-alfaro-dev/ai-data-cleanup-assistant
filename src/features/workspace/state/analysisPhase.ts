import type { AnalysisResult } from '@/engine/analysis/analysisResult';
import type { AnalysisStage } from '@/workers/analysisStage';

export type AnalysisPhase =
  | { status: 'idle' }
  | { status: 'running'; stage: AnalysisStage; percentage: number }
  | { status: 'done'; result: AnalysisResult }
  | { status: 'failed' };
