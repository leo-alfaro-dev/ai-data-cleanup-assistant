import type { ColumnKey, Row, RowId } from '@/engine/dataset/dataset';
import { jaroWinkler } from '@/engine/values/jaroWinkler';
import type { EvidenceColumn } from './evidenceColumn';
import { listColumnKeys } from './listColumnKeys';
import { listNameKeys } from './listNameKeys';

type PairComparer = {
  nameKeys: readonly (readonly string[])[];
  listAgreeingColumns: (pair: RowPair) => ColumnKey[];
  toNameSimilarity: (pair: RowPair) => number | null;
};

type RowPair = { first: RowId; second: RowId };

/**
 * Compares two rows from match keys computed once for every row in `rowIds`, so a comparison
 * costs a few string reads and no normalizing.
 */
export function createPairComparer({
  rows,
  rowIds,
  nameColumns,
  evidenceColumns,
}: {
  rows: readonly Row[];
  rowIds: readonly RowId[];
  nameColumns: readonly ColumnKey[];
  evidenceColumns: readonly EvidenceColumn[];
}): PairComparer {
  const nameKeys = listNameKeys({ rows, rowIds, nameColumns });
  const evidenceKeys = evidenceColumns.map((evidenceColumn) =>
    listColumnKeys({
      rows,
      rowIds,
      matchColumn: evidenceColumn,
      ignoredKeys: evidenceColumn.commonKeys,
    })
  );

  return {
    nameKeys,

    listAgreeingColumns({ first, second }) {
      const columns: ColumnKey[] = [];

      for (const [index, { column }] of evidenceColumns.entries()) {
        const keys = evidenceKeys[index];
        const key = keys?.[first];
        if (key !== undefined && key !== '' && key === keys?.[second]) {
          columns.push(column);
        }
      }

      return columns;
    },

    toNameSimilarity({ first, second }) {
      if (nameKeys.length === 0) return null;

      let total = 0;
      for (const keys of nameKeys) {
        const left = keys[first] ?? '';
        const right = keys[second] ?? '';
        if (left === '' || right === '') return null;

        total += jaroWinkler({ left, right });
      }

      return total / nameKeys.length;
    },
  };
}
