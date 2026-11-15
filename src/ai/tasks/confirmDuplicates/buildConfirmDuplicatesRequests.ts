import type { Dataset } from '@/engine/dataset/dataset';
import type { NearDuplicateCandidate } from '@/engine/matching/nearDuplicateCandidate';
import { shortenValue } from '@/lib/shortenValue';
import { MAX_CELL_LENGTH, MAX_HEADER_LENGTH } from '../../textLimits';
import type { ConfirmDuplicatesRequest } from './confirmDuplicatesContract';
import {
  MAX_COLUMNS_PER_PAIR,
  MAX_PAIRS_PER_REQUEST,
} from './confirmDuplicatesContract';

/**
 * One request holding the strongest candidate pairs, both rows of each as they are in the file. A
 * value longer than the cap is shortened with an ellipsis, since the reply only names columns.
 * No candidates means no request.
 */
export function buildConfirmDuplicatesRequests({
  dataset,
  candidates,
}: {
  dataset: Pick<Dataset, 'columns' | 'rows'>;
  candidates: readonly NearDuplicateCandidate[];
}): ConfirmDuplicatesRequest[] {
  const columnCount = Math.min(dataset.columns.length, MAX_COLUMNS_PER_PAIR);
  const cellsOf = (rowId: number) =>
    Array.from({ length: columnCount }, (_, column) =>
      shortenValue({
        value: dataset.rows[rowId]?.[column] ?? '',
        maxLength: MAX_CELL_LENGTH,
      })
    );
  const inRange = (columns: readonly number[]) =>
    columns.filter((column) => column < columnCount);

  const pairs = candidates
    .slice(0, MAX_PAIRS_PER_REQUEST)
    .map(({ rows, similarity, evidence }, id) => ({
      id,
      rows: [rows[0], rows[1]] satisfies [number, number],
      similarity: Math.round(similarity * 100) / 100,
      evidence: {
        nameSimilarity:
          evidence.nameSimilarity === null
            ? null
            : Math.round(evidence.nameSimilarity * 100) / 100,
        agreeingColumns: inRange(evidence.agreeingColumns),
        sharedIdentifierColumns: inRange(evidence.sharedIdentifierColumns),
      },
      first: cellsOf(rows[0]),
      second: cellsOf(rows[1]),
    }));
  if (pairs.length === 0) return [];

  return [
    {
      columns: dataset.columns
        .slice(0, columnCount)
        .map(({ header }) =>
          shortenValue({ value: header, maxLength: MAX_HEADER_LENGTH })
        ),
      pairs,
    },
  ];
}
