import type { AiFailureReason } from '@/ai/aiFailureReason';
import type { AiTaskName } from '@/ai/aiTaskName';

export type AiTaskSummary = {
  task: AiTaskName;
  total: number;
  settled: number;
} & (
  | { status: 'queued' | 'running' | 'done' }
  | { status: 'failed'; reason: AiFailureReason; failedCount: number }
);
