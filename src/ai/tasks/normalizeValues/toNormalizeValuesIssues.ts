import type { Dataset, RowId } from '@/engine/dataset/dataset';
import { toColumnKey } from '@/engine/dataset/toColumnKey';
import { toRowId } from '@/engine/dataset/toRowId';
import type { Issue } from '@/engine/issues/issue';
import { toIssueId } from '@/engine/issues/toIssueId';
import { lowestConfidence } from '@/engine/issues/lowestConfidence';
import { normalizeWhitespace } from '@/engine/values/normalizeWhitespace';
import type { NormalizeValuesResult } from './normalizeValuesContract';

/**
 * A group of spellings becomes an inconsistent-values issue that maps them to one value, and the
 * placeholders become one missing-data issue that empties them. The rows and counts are read
 * from the file, not from the reply.
 */
export function toNormalizeValuesIssues({
  result,
  dataset,
}: {
  result: NormalizeValuesResult;
  dataset: Pick<Dataset, 'rows'>;
}): Issue[] {
  const column = toColumnKey(result.column.key);
  const placeholderValues = result.placeholders.map(({ value }) => value);
  const rowsByValue = collectRows({
    dataset,
    column,
    wanted: new Set([
      ...result.groups.flatMap(({ variants }) => variants),
      ...placeholderValues,
    ]),
  });
  const rowsOf = (values: readonly string[]): RowId[] =>
    values
      .flatMap((value) => rowsByValue.get(value) ?? [])
      .sort((first, second) => first - second);
  const countOf = (value: string) => rowsByValue.get(value)?.length ?? 0;

  const issues = result.groups.flatMap((group, index): Issue[] => {
    const rows = rowsOf(group.variants);
    if (rows.length === 0) return [];

    return [
      {
        id: toIssueId(`normalize-values:${column}:${index}`),
        category: 'inconsistent',
        source: 'ai',
        confidence: group.confidence,
        rows,
        column,
        suggestion: {
          kind: 'mapValues',
          column,
          groups: [{ canonical: group.canonical, variants: group.variants }],
        },
        details: {
          kind: 'normalizedSpellings',
          canonical: group.canonical,
          isCanonicalInFile: group.isCanonicalInFile,
          variants: group.variants.flatMap((value) =>
            countOf(value) > 0 ? [{ value, count: countOf(value) }] : []
          ),
          reason: group.reason,
        },
      },
    ];
  });

  const placeholderRows = rowsOf(placeholderValues);
  const [firstPlaceholder, ...otherPlaceholders] = result.placeholders;
  if (placeholderRows.length > 0 && firstPlaceholder) {
    issues.push({
      id: toIssueId(`normalize-values:${column}:placeholders`),
      category: 'missing',
      source: 'ai',
      confidence: lowestConfidence([
        firstPlaceholder.confidence,
        ...otherPlaceholders.map(({ confidence }) => confidence),
      ]),
      rows: placeholderRows,
      column,
      suggestion: {
        kind: 'mapValues',
        column,
        groups: [{ canonical: '', variants: placeholderValues }],
      },
      details: {
        kind: 'aiPlaceholders',
        placeholders: result.placeholders.map(({ value, reason }) => ({
          value,
          reason,
          count: countOf(value),
        })),
      },
    });
  }

  return issues;
}

function collectRows({
  dataset,
  column,
  wanted,
}: {
  dataset: Pick<Dataset, 'rows'>;
  column: ReturnType<typeof toColumnKey>;
  wanted: ReadonlySet<string>;
}): Map<string, RowId[]> {
  const rowsByValue = new Map<string, RowId[]>();

  for (const [index, row] of dataset.rows.entries()) {
    const value = normalizeWhitespace(row[column] ?? '');
    if (!wanted.has(value)) continue;

    const rows = rowsByValue.get(value) ?? [];
    rows.push(toRowId(index));
    rowsByValue.set(value, rows);
  }

  return rowsByValue;
}
