import { z } from 'zod';
import { toColumnKey } from '@/engine/dataset/toColumnKey';
import { toRowId } from '@/engine/dataset/toRowId';

export type Truth = z.infer<typeof truthSchema>;

export type PlantedError = z.infer<typeof plantedErrorSchema>;

const rowIdSchema = z.number().int().nonnegative().transform(toRowId);

const columnKeySchema = z.number().int().nonnegative().transform(toColumnKey);

const plantedCell = {
  rowId: rowIdSchema,
  column: columnKeySchema,
  cleanValue: z.string(),
  corruptedValue: z.string(),
};

// No cell carries two errors, and no value error lands in either row of a duplicate pair.
const plantedErrorSchema = z.discriminatedUnion('category', [
  // A copy always comes after its original; an original copied twice has two entries.
  z.object({
    category: z.literal('duplicate'),
    kind: z.enum([
      'exactCopy',
      'nameTypo',
      'casing',
      'phoneFormat',
      'blankedField',
    ]),
    original: rowIdSchema,
    copy: rowIdSchema,
  }),
  z.object({
    category: z.literal('inconsistent'),
    kind: z.enum(['stateVariant', 'casing', 'spacing', 'dateFormat']),
    ...plantedCell,
  }),
  z.object({
    category: z.literal('missing'),
    kind: z.enum(['blank', 'placeholder']),
    ...plantedCell,
  }),
  z.object({
    category: z.literal('suspicious'),
    kind: z.enum([
      'spendTimes100',
      'negativeSpend',
      'emailWithoutAt',
      'emailDomainTypo',
      'formulaLike',
    ]),
    ...plantedCell,
  }),
]);

export const truthSchema = z.object({
  seed: z.number().int(),
  errors: z.array(plantedErrorSchema),
});
