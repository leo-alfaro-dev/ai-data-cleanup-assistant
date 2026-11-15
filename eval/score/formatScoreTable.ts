import type { IssueCategory } from '@/engine/issues/issue';
import { ISSUE_CATEGORIES } from '@/engine/issues/issue';
import { CATEGORY_LABELS } from './categoryLabels';
import type { CategoryScore } from './categoryScore';
import { formatPercent } from './formatPercent';

export function formatScoreTable(
  scores: Record<IssueCategory, CategoryScore>
): string {
  const header = ['Category', ...COLUMNS.map(({ title }) => title)];
  const rows = ISSUE_CATEGORIES.map((category) => [
    CATEGORY_LABELS[category],
    ...COLUMNS.map(({ format }) => format(scores[category])),
  ]);
  const widths = header.map((title, position) =>
    Math.max(title.length, ...rows.map((row) => row[position]?.length ?? 0))
  );

  return [header, ...rows]
    .map((row) =>
      row
        .map((cell, position) => {
          const width = widths[position] ?? 0;
          return position === 0 ? cell.padEnd(width) : cell.padStart(width);
        })
        .join('  ')
    )
    .join('\n');
}

const COLUMNS: {
  title: string;
  format: (score: CategoryScore) => string;
}[] = [
  { title: 'Planted', format: ({ planted }) => String(planted) },
  { title: 'Found', format: ({ found }) => String(found) },
  { title: 'Recall', format: ({ recall }) => formatPercent(recall) },
  { title: 'Claimed', format: ({ claimed }) => String(claimed) },
  { title: 'Correct', format: ({ correctClaims }) => String(correctClaims) },
  { title: 'Precision', format: ({ precision }) => formatPercent(precision) },
  { title: 'Suggested', format: ({ suggested }) => String(suggested) },
  {
    title: 'Right',
    format: ({ rightSuggestions }) => String(rightSuggestions),
  },
  {
    title: 'Accuracy',
    format: ({ suggestionAccuracy }) => formatPercent(suggestionAccuracy),
  },
];
