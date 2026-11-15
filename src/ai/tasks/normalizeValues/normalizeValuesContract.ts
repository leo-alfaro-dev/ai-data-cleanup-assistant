import { z } from 'zod';
import { CONFIDENCES } from '@/engine/issues/issue';
import { MAX_HEADER_LENGTH, MAX_TYPE_LENGTH } from '../../textLimits';

export const MAX_REPLY_TOKENS = 8_000;

export const MAX_VALUES_PER_REQUEST = 200;

export const MAX_VALUE_LENGTH = 80;

export const MAX_COLUMNS_PER_FILE = 12;

// A file with fewer rows than this has too few repeats to tell a category from free text.
export const SMALL_FILE_ROW_LIMIT = 200;

export const normalizeValuesRequest = z.object({
  column: z.object({
    key: z.number().int().min(0),
    header: z.string().max(MAX_HEADER_LENGTH + 1),
    dominantType: z.string().max(MAX_TYPE_LENGTH),
  }),
  values: z
    .array(
      z.object({
        value: z.string().min(1).max(MAX_VALUE_LENGTH),
        count: z.number().int().min(1),
      })
    )
    .min(2)
    .max(MAX_VALUES_PER_REQUEST),
  // True when every distinct value of the column is in `values`.
  isComplete: z.boolean(),
});

export type NormalizeValuesRequest = z.infer<typeof normalizeValuesRequest>;

// Every property is required, as the strict JSON schema of a response format needs.
export const normalizeValuesReply = z.object({
  groups: z.array(
    z.object({
      canonical: z.string(),
      variants: z.array(z.string()),
      reason: z.string(),
      confidence: z.enum(CONFIDENCES),
    })
  ),
  placeholders: z.array(
    z.object({
      value: z.string(),
      reason: z.string(),
      confidence: z.enum(CONFIDENCES),
    })
  ),
});

export type NormalizeValuesReply = z.infer<typeof normalizeValuesReply>;

export const normalizeValuesResult = z.object({
  column: normalizeValuesRequest.shape.column,
  groups: z.array(
    z.object({
      canonical: z.string(),
      // False when the model chose a spelling that is not in the file.
      isCanonicalInFile: z.boolean(),
      variants: z.array(z.string()),
      reason: z.string(),
      confidence: z.enum(CONFIDENCES),
    })
  ),
  placeholders: z.array(
    z.object({
      value: z.string(),
      reason: z.string(),
      confidence: z.enum(CONFIDENCES),
    })
  ),
  claimCount: z.number().int().min(0),
  droppedClaims: z.number().int().min(0),
});

export type NormalizeValuesResult = z.infer<typeof normalizeValuesResult>;
