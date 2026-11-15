import type { ColumnKey, RowId } from '@/engine/dataset/dataset';
import { toRowId } from '@/engine/dataset/toRowId';
import type { Issue } from '@/engine/issues/issue';
import { toIssueId } from '@/engine/issues/toIssueId';
import { normalizeWhitespace } from '@/engine/values/normalizeWhitespace';
import type { Check } from './check';
import { toCheckId } from './toCheckId';

const id = toCheckId('whitespace');

export const findWhitespaceIssues: Check = {
  id,
  category: 'inconsistent',
  find({ dataset }) {
    const tallies = dataset.columns.map(({ key }): Tally => ({
      column: key,
      rows: [],
      paddedCount: 0,
      innerCount: 0,
      nonBreakingCount: 0,
    }));

    for (const [index, row] of dataset.rows.entries()) {
      for (const tally of tallies) {
        const value = row[tally.column] ?? '';
        if (normalizeWhitespace(value) === value) continue;

        recordCell({ tally, rowId: toRowId(index), value });
      }
    }

    return tallies.filter(({ rows }) => rows.length > 0).map(toIssue);
  },
};

type Tally = {
  column: ColumnKey;
  rows: RowId[];
  paddedCount: number;
  innerCount: number;
  nonBreakingCount: number;
};

const PADDED = /^\s|\s$/;

const NON_BREAKING_SPACE = '\u00a0';

function recordCell({
  tally,
  rowId,
  value,
}: {
  tally: Tally;
  rowId: RowId;
  value: string;
}): void {
  const trimmed = value.trim();

  tally.rows.push(rowId);
  if (PADDED.test(value)) tally.paddedCount += 1;
  if (normalizeWhitespace(trimmed) !== trimmed) tally.innerCount += 1;
  if (value.includes(NON_BREAKING_SPACE)) tally.nonBreakingCount += 1;
}

function toIssue({
  column,
  rows,
  paddedCount,
  innerCount,
  nonBreakingCount,
}: Tally): Issue {
  return {
    id: toIssueId(`${id}:${column}`),
    category: 'inconsistent',
    source: 'check',
    confidence: 'certain',
    rows,
    column,
    suggestion: { kind: 'trimWhitespace', column },
    details: { kind: 'whitespace', paddedCount, innerCount, nonBreakingCount },
  };
}
