import { z } from 'zod';
import { CONFIDENCES } from '@/engine/issues/issue';
import {
  MAX_CELL_LENGTH,
  MAX_FLAGGING_ISSUES_PER_ROW,
  MAX_HEADER_LENGTH,
  MAX_ISSUE_ID_LENGTH,
  MAX_TYPE_LENGTH,
} from '../../textLimits';

export const MAX_REPLY_TOKENS = 16_000;

export const MAX_FLAGGED_ROWS = 40;

export const MAX_SAMPLED_ROWS = 40;

export const MAX_COLUMNS_PER_ROW = 30;

export const MAX_TOP_VALUES = 5;

const count = z.number().int().min(0);

export const assessSuspiciousRowsRequest = z
  .object({
    columns: z
      .array(
        z.object({
          header: z.string().max(MAX_HEADER_LENGTH + 1),
          type: z.string().max(MAX_TYPE_LENGTH),
          distinctCount: count,
          blankCount: count,
          range: z
            .object({
              minimum: z.number(),
              maximum: z.number(),
              median: z.number(),
            })
            .nullable(),
          topValues: z
            .array(
              z.object({
                value: z.string().max(MAX_CELL_LENGTH + 1),
                count: count.min(1),
              })
            )
            .max(MAX_TOP_VALUES),
        })
      )
      .min(1)
      .max(MAX_COLUMNS_PER_ROW),
    rows: z
      .array(
        z.object({
          id: count,
          rowId: count,
          // The check issues that flagged the row.
          flaggedBy: z
            .array(z.string().max(MAX_ISSUE_ID_LENGTH))
            .max(MAX_FLAGGING_ISSUES_PER_ROW),
          cells: z
            .array(z.string().max(MAX_CELL_LENGTH + 1))
            .max(MAX_COLUMNS_PER_ROW),
        })
      )
      .min(1)
      .max(MAX_FLAGGED_ROWS + MAX_SAMPLED_ROWS),
    // True when every row of the file is in `rows`.
    isComplete: z.boolean(),
  })
  .refine(
    ({ columns, rows }) =>
      rows.every(({ cells }) => cells.length === columns.length),
    { message: 'Every row needs one cell per column.' }
  );

export type AssessSuspiciousRowsRequest = z.infer<
  typeof assessSuspiciousRowsRequest
>;

// Every property is required, as the strict JSON schema of a response format needs.
export const assessSuspiciousRowsReply = z.object({
  rows: z.array(
    z.object({
      id: z.number().int(),
      isSuspicious: z.boolean(),
      column: z.number().int().nullable(),
      reason: z.string(),
      confidence: z.enum(CONFIDENCES),
      suggestedValue: z.string().nullable(),
    })
  ),
});

export type AssessSuspiciousRowsReply = z.infer<
  typeof assessSuspiciousRowsReply
>;

export const assessSuspiciousRowsResult = z.object({
  rows: z.array(
    z.object({
      rowId: count,
      flaggedBy: z.array(z.string()),
      isSuspicious: z.boolean(),
      column: count.nullable(),
      reason: z.string(),
      confidence: z.enum(CONFIDENCES),
      suggestedValue: z.string().nullable(),
    })
  ),
  claimCount: count,
  droppedClaims: count,
});

export type AssessSuspiciousRowsResult = z.infer<
  typeof assessSuspiciousRowsResult
>;
