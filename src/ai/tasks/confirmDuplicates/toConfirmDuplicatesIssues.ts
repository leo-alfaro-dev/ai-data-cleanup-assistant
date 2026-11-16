import type { MergeChoice } from '@/engine/changes/change';
import type { Dataset } from '@/engine/dataset/dataset';
import { toColumnKey } from '@/engine/dataset/toColumnKey';
import { toRowId } from '@/engine/dataset/toRowId';
import type { Issue } from '@/engine/issues/issue';
import { toIssueId } from '@/engine/issues/toIssueId';
import { toMergeRows } from '@/engine/matching/toMergeRows';
import { isBlank } from '@/engine/values/isBlank';
import { isPlaceholder } from '@/engine/values/isPlaceholder';
import { withoutEmDashes } from '@/lib/withoutEmDashes';
import type { ConfirmDuplicatesResult } from './confirmDuplicatesContract';

/**
 * A confirmed pair becomes a duplicate issue that merges the two rows. A column the model chose
 * from the other row takes that row's value, unless it is blank or a placeholder; a column it did
 * not mention keeps the kept row's value, with blank cells filled from the other row as the
 * checks do. No value is ever made up.
 */
export function toConfirmDuplicatesIssues({
  result,
  dataset,
}: {
  result: ConfirmDuplicatesResult;
  dataset: Pick<Dataset, 'rows'>;
}): Issue[] {
  return result.duplicates.map(
    ({ rows, confidence, reason, keep, choices }) => {
      const kept = toRowId(keep === 'first' ? rows[0] : rows[1]);
      const other = toRowId(keep === 'first' ? rows[1] : rows[0]);
      const decided = new Set(choices.map(({ column }) => column));
      const fills = toMergeRows({
        rows: dataset.rows,
        keep: kept,
        remove: [other],
      }).values.filter(({ column }) => !decided.has(column));
      const takes = choices.flatMap(({ column, keep: side }): MergeChoice[] => {
        const value = dataset.rows[other]?.[column] ?? '';
        const isUsable = !isBlank(value) && !isPlaceholder(value);

        return side !== keep && isUsable
          ? [{ column: toColumnKey(column), from: other }]
          : [];
      });
      const first = Math.min(kept, other);
      const second = Math.max(kept, other);

      return {
        id: toIssueId(`confirm-duplicates:${first}-${second}`),
        category: 'duplicate',
        source: 'ai',
        confidence,
        rows: [toRowId(first), toRowId(second)],
        column: null,
        suggestion: {
          kind: 'mergeRows',
          keep: kept,
          remove: [other],
          values: [...fills, ...takes].sort(
            (left, right) => left.column - right.column
          ),
        },
        details: {
          kind: 'confirmedDuplicate',
          keptRow: kept,
          reason: withoutEmDashes(reason),
        },
      };
    }
  );
}
