import { z } from 'zod';
import { AI_FAILURE_REASONS } from './aiFailureReason';

export const aiCallRecord = z.object({
  task: z.string(),
  model: z.string(),
  promptTokens: z.number(),
  completionTokens: z.number(),
  totalTokens: z.number(),
  // In US dollars as OpenRouter reports it; null when the reply carried no cost.
  cost: z.number().nullable(),
  latencyMs: z.number(),
  outcome: z.enum(['valid', ...AI_FAILURE_REASONS]),
});

export type AiCallRecord = z.infer<typeof aiCallRecord>;
