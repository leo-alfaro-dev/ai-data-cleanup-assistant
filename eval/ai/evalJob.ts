import type { AiCallRecord } from '@/ai/aiCallRecord';
import type { AiClient } from '@/ai/aiClient';
import type { AiFailureReason } from '@/ai/aiFailureReason';
import type { AiMessage } from '@/ai/aiMessage';
import type { AiTaskName } from '@/ai/aiTaskName';
import type { AiTaskResult } from '@/ai/aiTaskResult';

export type EvalJobOutcome =
  | { ok: true; taskResult: AiTaskResult; calls: AiCallRecord[] }
  | { ok: false; reason: AiFailureReason; calls: AiCallRecord[] };

export type EvalJob = {
  task: AiTaskName;
  messages: readonly AiMessage[];
  maxTokens: number;
  replySchemaCharacters: number;
  run: (args: { client: AiClient; model: string }) => Promise<EvalJobOutcome>;
};
