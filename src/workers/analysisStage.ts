export const ANALYSIS_STAGES = ['profiling', 'checking', 'matching'] as const;

export type AnalysisStage = (typeof ANALYSIS_STAGES)[number];
