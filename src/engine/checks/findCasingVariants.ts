import type { ColumnKey, RowId } from '@/engine/dataset/dataset';
import { toRowId } from '@/engine/dataset/toRowId';
import type { Issue } from '@/engine/issues/issue';
import { toIssueId } from '@/engine/issues/toIssueId';
import type { ColumnProfile } from '@/engine/profile/columnProfile';
import { isBlank } from '@/engine/values/isBlank';
import { isNameHeader } from '@/engine/values/isNameHeader';
import { normalizeWhitespace } from '@/engine/values/normalizeWhitespace';
import { toComparisonKey } from '@/engine/values/toComparisonKey';
import type { Check } from './check';
import { toCasingGroups } from './toCasingGroups';
import { toCheckId } from './toCheckId';

const id = toCheckId('casing-variants');

export const findCasingVariants: Check = {
  id,
  category: 'inconsistent',
  find({ dataset, profile }) {
    const tallies = dataset.columns.flatMap(({ key, header }): Tally[] => {
      const columnProfile = profile[key];
      const isEligible =
        columnProfile !== undefined &&
        isCasingColumn({ header, profile: columnProfile });

      return isEligible ? [{ column: key, spellingsByKey: new Map() }] : [];
    });
    if (tallies.length === 0) return [];

    for (const [index, row] of dataset.rows.entries()) {
      for (const { column, spellingsByKey } of tallies) {
        const value = row[column] ?? '';
        if (isBlank(value)) continue;

        const spelling = normalizeWhitespace(value);
        const key = toComparisonKey(spelling);
        const spellings = spellingsByKey.get(key) ?? new Map<string, RowId[]>();
        spellingsByKey.set(key, spellings);
        const rows = spellings.get(spelling) ?? [];
        spellings.set(spelling, rows);
        rows.push(toRowId(index));
      }
    }

    return tallies.flatMap(toIssues);
  },
};

type Tally = {
  column: ColumnKey;
  spellingsByKey: Map<string, Map<string, RowId[]>>;
};

function isCasingColumn({
  header,
  profile,
}: {
  header: string;
  profile: ColumnProfile;
}): boolean {
  const hasLabels =
    profile.dominantType === 'text' || profile.dominantType === 'boolean';

  return profile.isCategorical && hasLabels && !isNameHeader(header);
}

function toIssues({ column, spellingsByKey }: Tally): Issue[] {
  const groups = toCasingGroups(spellingsByKey);
  if (groups.length === 0) return [];

  const rows = groups
    .flatMap(({ variants }) => variants.flatMap((variant) => variant.rows))
    .sort((first, second) => first - second);

  return [
    {
      id: toIssueId(`${id}:${column}`),
      category: 'inconsistent',
      source: 'check',
      confidence: 'high',
      rows,
      column,
      suggestion: {
        kind: 'mapValues',
        column,
        groups: groups.map(({ canonical, variants }) => ({
          canonical: canonical.value,
          variants: variants.map((variant) => variant.value),
        })),
      },
      details: {
        kind: 'casingVariants',
        groups: groups.map(({ canonical, variants }) => ({
          canonical: canonical.value,
          canonicalCount: canonical.rows.length,
          variants: variants.map(({ value, rows: variantRows }) => ({
            value,
            count: variantRows.length,
          })),
        })),
      },
    },
  ];
}
