import type { ColumnKey } from '@/engine/dataset/dataset';
import type { DateFormat } from '@/engine/values/dateFormat';
import type { ValueType } from '@/engine/values/valueType';

export type DistinctValue = {
  value: string;
  count: number;
};

export type TypeCounts = Record<Exclude<ValueType, 'empty'>, number>;

export type NumberSummary = {
  count: number;
  minimum: number;
  maximum: number;
  median: number;
  medianAbsoluteDeviation: number;
};

export type DateSummary = {
  formatCounts: Record<DateFormat, number>;
  // Values that fit both slash orders, ambiguousCount being those that read as two different dates.
  unknownOrderCount: number;
  ambiguousCount: number;
};

type ProfileBase = {
  column: ColumnKey;
  blankCount: number;
  nonBlankCount: number;
  distinctCount: number;
  distinctValues: readonly DistinctValue[];
  hasTruncatedDistinctValues: boolean;
  isCategorical: boolean;
  isIdentifierLike: boolean;
};

type TypedProfile = ProfileBase & { typeCounts: TypeCounts };

export type ColumnProfile =
  | (ProfileBase & { dominantType: 'empty' })
  | (TypedProfile & {
      dominantType: 'integer' | 'decimal';
      numbers: NumberSummary;
    })
  | (TypedProfile & { dominantType: 'date'; dates: DateSummary })
  | (TypedProfile & {
      dominantType: 'boolean' | 'email' | 'phone' | 'url' | 'text' | 'mixed';
    });
