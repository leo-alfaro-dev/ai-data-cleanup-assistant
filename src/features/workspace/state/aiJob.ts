import type { AiFailureReason } from '@/ai/aiFailureReason';
import type { AiJobRequest } from '@/ai/aiJobRequest';

export type AiJobState =
  | { status: 'queued' }
  | { status: 'running' }
  | { status: 'done' }
  | { status: 'failed'; reason: AiFailureReason };

export type AiJob = {
  key: string;
  request: AiJobRequest;
  state: AiJobState;
};
