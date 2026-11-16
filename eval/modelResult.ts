import { z } from 'zod';
import { AI_FAILURE_REASONS } from '@/ai/aiFailureReason';
import { AI_TASK_NAMES } from '@/ai/aiTaskName';
import { scoresSchema } from './score/scoresSchema';

export type ModelResult = z.infer<typeof modelResultSchema>;

export const modelResultSchema = z.object({
  run: z.literal('model'),
  model: z.string(),
  date: z.string(),
  dataset: z.string(),
  seed: z.number(),
  rows: z.number(),
  issues: z.number(),
  calls: z.number(),
  failedTasks: z.array(
    z.object({
      task: z.enum(AI_TASK_NAMES),
      reason: z.enum(AI_FAILURE_REASONS),
    })
  ),
  tokens: z.number(),
  cost: z.number(),
  callsWithoutCost: z.number(),
  wallMs: z.number(),
  scores: scoresSchema,
});
