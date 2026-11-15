import type { ColumnKey, RowId } from '@/engine/dataset/dataset';
import { toRowId } from '@/engine/dataset/toRowId';
import type { Confidence, Issue } from '@/engine/issues/issue';
import { toIssueId } from '@/engine/issues/toIssueId';
import { isBlank } from '@/engine/values/isBlank';
import { isPlaceholder } from '@/engine/values/isPlaceholder';
import { normalizeWhitespace } from '@/engine/values/normalizeWhitespace';
import type { Check } from './check';
import { toCheckId } from './toCheckId';

const id = toCheckId('placeholders');

// Above this share of a column's values, a placeholder may be a real category such as a plan called "none".
const MAX_CONFIDENT_PLACEHOLDER_SHARE = 0.2;

export const findPlaceholders: Check = {
  id,
  category: 'missing',
  find({ dataset }) {
    const tallies = dataset.columns.map(({ key }): Tally => ({
      column: key,
      rows: [],
      countsBySpelling: new Map(),
      filledCount: 0,
    }));

    for (const [index, row] of dataset.rows.entries()) {
      for (const tally of tallies) {
        const value = row[tally.column] ?? '';
        if (isBlank(value)) continue;

        tally.filledCount += 1;
        if (!isPlaceholder(value)) continue;

        const spelling = normalizeWhitespace(value);
        tally.rows.push(toRowId(index));
        tally.countsBySpelling.set(
          spelling,
          (tally.countsBySpelling.get(spelling) ?? 0) + 1
        );
      }
    }

    return tallies.filter(({ rows }) => rows.length > 0).map(toIssue);
  },
};

type Tally = {
  column: ColumnKey;
  rows: RowId[];
  countsBySpelling: Map<string, number>;
  filledCount: number;
};

function toIssue({
  column,
  rows,
  countsBySpelling,
  filledCount,
}: Tally): Issue {
  const spellings = [...countsBySpelling].map(([value, count]) => ({
    value,
    count,
  }));
  const confidence: Confidence =
    rows.length / filledCount > MAX_CONFIDENT_PLACEHOLDER_SHARE
      ? 'medium'
      : 'high';

  return {
    id: toIssueId(`${id}:${column}`),
    category: 'missing',
    source: 'check',
    confidence,
    rows,
    column,
    suggestion: {
      kind: 'mapValues',
      column,
      groups: [
        { canonical: '', variants: spellings.map(({ value }) => value) },
      ],
    },
    details: { kind: 'placeholders', spellings, filledCount },
  };
}
