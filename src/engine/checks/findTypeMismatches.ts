import type { ColumnKey, RowId } from '@/engine/dataset/dataset';
import { toRowId } from '@/engine/dataset/toRowId';
import type { Issue } from '@/engine/issues/issue';
import { toIssueId } from '@/engine/issues/toIssueId';
import type { ColumnProfile, TypeCounts } from '@/engine/profile/columnProfile';
import { detectValueType } from '@/engine/values/detectValueType';
import { isNumericType } from '@/engine/values/isNumericType';
import { isPlaceholder } from '@/engine/values/isPlaceholder';
import { toMatchKey } from '@/engine/values/toMatchKey';
import type { Check } from './check';
import { toCheckId } from './toCheckId';

const id = toCheckId('type-mismatches');

export const findTypeMismatches: Check = {
  id,
  category: 'inconsistent',
  find({ dataset, profile }) {
    const tallies = dataset.columns.flatMap(({ key }): Tally[] => {
      const columnProfile = profile[key];
      const expectedType = columnProfile && toExpectedType(columnProfile);
      if (!expectedType) return [];

      return [{ column: key, expectedType, rows: [], countsByType: new Map() }];
    });
    if (tallies.length === 0) return [];

    for (const [index, row] of dataset.rows.entries()) {
      for (const { column, expectedType, rows, countsByType } of tallies) {
        const value = row[column] ?? '';
        const type = detectValueType(value);
        const isNumberOfSameFamily =
          isNumericType(type) && isNumericType(expectedType);
        const isPhoneWithoutPunctuation =
          expectedType === 'phone' &&
          type === 'integer' &&
          toMatchKey({ value, isPhone: true }) !== null;
        const isExpected =
          type === expectedType ||
          isNumberOfSameFamily ||
          isPhoneWithoutPunctuation;
        if (type === 'empty' || isExpected || isPlaceholder(value)) continue;

        rows.push(toRowId(index));
        countsByType.set(type, (countsByType.get(type) ?? 0) + 1);
      }
    }

    return tallies.filter(({ rows }) => rows.length > 0).map(toIssue);
  },
};

type TypedValue = keyof TypeCounts;

type Tally = {
  column: ColumnKey;
  expectedType: TypedValue;
  rows: RowId[];
  countsByType: Map<TypedValue, number>;
};

function toExpectedType(profile: ColumnProfile): TypedValue | null {
  switch (profile.dominantType) {
    case 'empty':
    case 'email':
    case 'text':
    case 'mixed':
      return null;
    case 'integer':
    case 'decimal':
    case 'date':
    case 'boolean':
    case 'phone':
    case 'url': {
      const { typeCounts, nonBlankCount } = profile;
      const expectedCount = isNumericType(profile.dominantType)
        ? typeCounts.integer + typeCounts.decimal
        : typeCounts[profile.dominantType];

      return expectedCount === nonBlankCount ? null : profile.dominantType;
    }
  }
}

function toIssue({ column, expectedType, rows, countsByType }: Tally): Issue {
  return {
    id: toIssueId(`${id}:${column}`),
    category: 'inconsistent',
    source: 'check',
    confidence: 'medium',
    rows,
    column,
    suggestion: null,
    details: {
      kind: 'typeMismatches',
      expectedType,
      mismatches: [...countsByType]
        .map(([type, count]) => ({ type, count }))
        .sort((left, right) => right.count - left.count),
    },
  };
}
