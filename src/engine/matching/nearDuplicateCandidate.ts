import type { ColumnKey, RowId } from '@/engine/dataset/dataset';

// Two rows worth a second opinion. `similarity` orders candidates: 1 when the rows share an
// identifier, otherwise the name similarity.
export type NearDuplicateCandidate = {
  rows: readonly [RowId, RowId];
  similarity: number;
  evidence: {
    // Mean Jaro-Winkler score of the name columns; null when there are none or a row has no name.
    nameSimilarity: number | null;
    // Evidence columns, name columns apart, where both rows hold the same value.
    agreeingColumns: readonly ColumnKey[];
    sharedIdentifierColumns: readonly ColumnKey[];
  };
};
