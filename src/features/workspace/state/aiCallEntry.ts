import type { AiCallRecord } from '@/ai/aiCallRecord';
import type { AiFailureReason } from '@/ai/aiFailureReason';
import type { AiTaskName } from '@/ai/aiTaskName';
import type { RunId } from './runId';

// One request to one route: the body the browser sent, and what the server recorded.
export type AiCallEntry = {
  key: string;
  runId: RunId;
  task: AiTaskName;
  model: string;
  requestBody: string;
  outcome: 'ok' | AiFailureReason;
  records: readonly AiCallRecord[];
  // Null when the call failed before any claim was made.
  claimCount: number | null;
  droppedClaims: number | null;
};
