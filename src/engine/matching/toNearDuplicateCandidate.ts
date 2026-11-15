import type { ColumnKey, RowId } from '@/engine/dataset/dataset';
import type { NearDuplicateCandidate } from './nearDuplicateCandidate';

export function toNearDuplicateCandidate({
  first,
  second,
  agreeingColumns,
  nameSimilarity,
  identifiers,
}: {
  first: RowId;
  second: RowId;
  agreeingColumns: readonly ColumnKey[];
  nameSimilarity: number | null;
  identifiers: ReadonlySet<ColumnKey>;
}): NearDuplicateCandidate {
  const sharedIdentifierColumns = agreeingColumns.filter((column) =>
    identifiers.has(column)
  );
  const hasSharedIdentifier = sharedIdentifierColumns.length > 0;

  return {
    rows: [first, second],
    similarity: hasSharedIdentifier ? 1 : (nameSimilarity ?? 0),
    evidence: { nameSimilarity, agreeingColumns, sharedIdentifierColumns },
  };
}
