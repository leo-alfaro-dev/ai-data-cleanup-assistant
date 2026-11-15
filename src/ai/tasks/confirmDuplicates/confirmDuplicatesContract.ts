import { z } from 'zod';
import { CONFIDENCES } from '@/engine/issues/issue';
import { MAX_CELL_LENGTH, MAX_HEADER_LENGTH } from '../../textLimits';

export const MAX_REPLY_TOKENS = 12_000;

export const MAX_PAIRS_PER_REQUEST = 30;

export const MAX_COLUMNS_PER_PAIR = 30;

const side = z.enum(['first', 'second']);

const rowId = z.number().int().min(0);

export const confirmDuplicatesRequest = z
  .object({
    columns: z
      .array(z.string().max(MAX_HEADER_LENGTH + 1))
      .min(1)
      .max(MAX_COLUMNS_PER_PAIR),
    pairs: z
      .array(
        z.object({
          id: z.number().int().min(0),
          rows: z.tuple([rowId, rowId]),
          similarity: z.number().min(0).max(1),
          evidence: z.object({
            nameSimilarity: z.number().min(0).max(1).nullable(),
            agreeingColumns: z
              .array(z.number().int().min(0))
              .max(MAX_COLUMNS_PER_PAIR),
            sharedIdentifierColumns: z
              .array(z.number().int().min(0))
              .max(MAX_COLUMNS_PER_PAIR),
          }),
          first: z
            .array(z.string().max(MAX_CELL_LENGTH + 1))
            .max(MAX_COLUMNS_PER_PAIR),
          second: z
            .array(z.string().max(MAX_CELL_LENGTH + 1))
            .max(MAX_COLUMNS_PER_PAIR),
        })
      )
      .min(1)
      .max(MAX_PAIRS_PER_REQUEST),
  })
  .refine(
    ({ columns, pairs }) =>
      pairs.every(
        ({ first, second }) =>
          first.length === columns.length && second.length === columns.length
      ),
    { message: 'Every pair needs one cell per column.' }
  );

export type ConfirmDuplicatesRequest = z.infer<typeof confirmDuplicatesRequest>;

// Every property is required, as the strict JSON schema of a response format needs.
export const confirmDuplicatesReply = z.object({
  pairs: z.array(
    z.object({
      id: z.number().int(),
      isDuplicate: z.boolean(),
      confidence: z.enum(CONFIDENCES),
      reason: z.string(),
      keep: side,
      columnChoices: z.array(
        z.object({ column: z.number().int(), keep: side })
      ),
    })
  ),
});

export type ConfirmDuplicatesReply = z.infer<typeof confirmDuplicatesReply>;

export const confirmDuplicatesResult = z.object({
  duplicates: z.array(
    z.object({
      rows: z.tuple([rowId, rowId]),
      confidence: z.enum(CONFIDENCES),
      reason: z.string(),
      keep: side,
      choices: z.array(
        z.object({ column: z.number().int().min(0), keep: side })
      ),
    })
  ),
  claimCount: z.number().int().min(0),
  droppedClaims: z.number().int().min(0),
});

export type ConfirmDuplicatesResult = z.infer<typeof confirmDuplicatesResult>;
