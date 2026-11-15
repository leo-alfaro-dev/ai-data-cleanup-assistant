import { z } from 'zod';
import { scoresSchema } from './score/scoresSchema';

export type ChecksOnlyResult = z.infer<typeof checksOnlyResultSchema>;

export const checksOnlyResultSchema = z.object({
  run: z.literal('checks-only'),
  dataset: z.string(),
  seed: z.number(),
  rows: z.number(),
  issues: z.number(),
  scores: scoresSchema,
});
