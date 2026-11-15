import type { Dataset, RowId } from '@/engine/dataset/dataset';
import type { ColumnProfile } from '@/engine/profile/columnProfile';
import { listDuplicateCopyRows } from '@/engine/rows/listDuplicateCopyRows';
import { listRowsWithout } from '@/engine/rows/listRowsWithout';
import { createPairComparer } from './createPairComparer';
import { listEvidenceColumns } from './listEvidenceColumns';
import { listIdentifierColumns } from './listIdentifierColumns';
import { listNameColumns } from './listNameColumns';
import { listNameNeighborPairs } from './listNameNeighborPairs';
import { listSharedIdentifierPairs } from './listSharedIdentifierPairs';
import type { NearDuplicateCandidate } from './nearDuplicateCandidate';
import { toNearDuplicateCandidate } from './toNearDuplicateCandidate';

export const MAX_CANDIDATE_PAIRS = 300;

// Each row is compared with this many rows after it in sorted order.
export const NEIGHBOR_WINDOW = 5;

export const MIN_NAME_SIMILARITY = 0.92;

/**
 * Pairs of rows worth a second opinion, strongest first: rows that share an identifier, and rows
 * whose names are nearly the same and that agree on another column. Rows the exact and normalized
 * duplicate checks remove are left out. Ties in similarity go to the pair with more agreeing
 * columns, then to the lower row ids.
 */
export function findNearDuplicateCandidates({
  dataset,
  profile,
}: {
  dataset: Dataset;
  profile: readonly ColumnProfile[];
}): NearDuplicateCandidate[] {
  const { rows } = dataset;
  const rowIds = [
    ...listRowsWithout({
      count: rows.length,
      excluded: listDuplicateCopyRows(rows),
    }),
  ];
  const identifierColumns = listIdentifierColumns({
    dataset,
    profile,
    rowIds,
  });
  const nameColumns = listNameColumns({ dataset, profile });
  const comparer = createPairComparer({
    rows,
    rowIds,
    nameColumns,
    evidenceColumns: listEvidenceColumns({ profile, excluded: nameColumns }),
  });
  const identifiers = new Set(identifierColumns.map(({ column }) => column));
  const toPairKey = ({ first, second }: { first: RowId; second: RowId }) =>
    first * rows.length + second;
  const candidates = new Map<number, NearDuplicateCandidate>();

  for (const [first, second] of listSharedIdentifierPairs({
    rows,
    rowIds,
    identifierColumns,
  })) {
    candidates.set(
      toPairKey({ first, second }),
      toNearDuplicateCandidate({
        first,
        second,
        identifiers,
        agreeingColumns: comparer.listAgreeingColumns({ first, second }),
        nameSimilarity: comparer.toNameSimilarity({ first, second }),
      })
    );
  }

  for (const [first, second] of listNameNeighborPairs({
    rowIds,
    nameKeys: comparer.nameKeys,
    windowSize: NEIGHBOR_WINDOW,
  })) {
    const pairKey = toPairKey({ first, second });
    if (candidates.has(pairKey)) continue;

    const agreeingColumns = comparer.listAgreeingColumns({ first, second });
    if (agreeingColumns.length === 0) continue;

    const nameSimilarity = comparer.toNameSimilarity({ first, second });
    const isSameName =
      nameSimilarity !== null && nameSimilarity >= MIN_NAME_SIMILARITY;
    if (!isSameName) continue;

    candidates.set(
      pairKey,
      toNearDuplicateCandidate({
        first,
        second,
        identifiers,
        agreeingColumns,
        nameSimilarity,
      })
    );
  }

  return [...candidates.values()]
    .sort(compareStrength)
    .slice(0, MAX_CANDIDATE_PAIRS);
}

function compareStrength(
  first: NearDuplicateCandidate,
  second: NearDuplicateCandidate
): number {
  return (
    second.similarity - first.similarity ||
    second.evidence.agreeingColumns.length -
      first.evidence.agreeingColumns.length ||
    first.rows[0] - second.rows[0] ||
    first.rows[1] - second.rows[1]
  );
}
