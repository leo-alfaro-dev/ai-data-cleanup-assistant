import type { ColumnKey, RowId } from '@/engine/dataset/dataset';
import type { TypeCounts } from '@/engine/profile/columnProfile';
import type { DateFormat } from '@/engine/values/dateFormat';
import type { FormulaTrigger } from '@/engine/values/formulaTrigger';

// A union by `kind`; each check adds its own variant.
export type IssueDetails =
  | { kind: 'exactDuplicates'; groups: readonly (readonly RowId[])[] }
  | { kind: 'normalizedDuplicates'; groups: readonly (readonly RowId[])[] }
  | {
      kind: 'sharedIdentifiers';
      links: readonly {
        column: ColumnKey;
        value: string;
        rows: readonly RowId[];
      }[];
      // A removed row's name is more than a typo from the kept row's, so no merge is suggested.
      hasConflictingNames: boolean;
    }
  | {
      kind: 'casingVariants';
      groups: readonly {
        canonical: string;
        canonicalCount: number;
        variants: readonly { value: string; count: number }[];
      }[];
    }
  | {
      kind: 'mixedDateFormats';
      dominantFormat: DateFormat;
      formatCounts: readonly { format: DateFormat; count: number }[];
      eitherOrderCount: number;
      ambiguousRows: readonly RowId[];
    }
  | {
      kind: 'typeMismatches';
      expectedType: keyof TypeCounts;
      mismatches: readonly { type: keyof TypeCounts; count: number }[];
    }
  | {
      kind: 'whitespace';
      paddedCount: number;
      innerCount: number;
      nonBreakingCount: number;
    }
  | { kind: 'emptyCells'; filledCount: number }
  | {
      kind: 'placeholders';
      spellings: readonly { value: string; count: number }[];
      filledCount: number;
    }
  | {
      kind: 'numericOutliers';
      median: number;
      lowerLimit: number;
      upperLimit: number;
    }
  | { kind: 'negativeValues'; median: number }
  | { kind: 'invalidEmails' }
  | {
      kind: 'emailDomainTypos';
      corrections: readonly {
        domain: string;
        correctedDomain: string;
        count: number;
      }[];
    }
  | {
      kind: 'formulaLikeValues';
      leadingCharacters: readonly FormulaTrigger[];
    }
  | {
      kind: 'raggedRows';
      headerCellCount: number;
      shortRowCount: number;
      longRowCount: number;
    }
  | { kind: 'emptyHeaders'; columns: readonly ColumnKey[] }
  | { kind: 'repeatedHeaders'; groups: readonly (readonly ColumnKey[])[] }
  | { kind: 'blankRows' }
  | { kind: 'skippedBlankLines'; count: number };
