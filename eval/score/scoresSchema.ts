import { z } from 'zod';
import { ISSUE_CATEGORIES } from '@/engine/issues/issue';

const categoryScoreSchema = z.object({
  planted: z.number(),
  claimed: z.number(),
  correctClaims: z.number(),
  found: z.number(),
  precision: z.number().nullable(),
  recall: z.number().nullable(),
  suggested: z.number(),
  rightSuggestions: z.number(),
  suggestionAccuracy: z.number().nullable(),
});

export const scoresSchema = z.record(
  z.enum(ISSUE_CATEGORIES),
  categoryScoreSchema
);
