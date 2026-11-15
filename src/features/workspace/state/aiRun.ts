import type { AiModelId } from '@/ai/models';
import type { AiJob } from './aiJob';
import type { RunId } from './runId';

export type AiRun = {
  runId: RunId;
  model: AiModelId;
  jobs: readonly AiJob[];
};
