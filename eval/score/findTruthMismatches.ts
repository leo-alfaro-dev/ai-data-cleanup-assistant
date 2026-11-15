import type { Dataset } from '@/engine/dataset/dataset';
import { toRowNumber } from '@/engine/dataset/toRowNumber';
import type { Truth } from '../corrupt/truth';
import { toCellKey } from './toCellKey';

export function findTruthMismatches({
  truth,
  dataset,
}: {
  truth: Truth;
  dataset: Dataset;
}): string[] {
  const mismatches: string[] = [];
  const plantedCells = new Set<string>();

  for (const error of truth.errors) {
    if (error.category === 'duplicate') {
      for (const rowId of [error.original, error.copy]) {
        if (dataset.rows[rowId]) continue;

        mismatches.push(
          `A duplicate names row ${toRowNumber(rowId)}, which is not in the file.`
        );
      }
      continue;
    }

    const cell = `Row ${toRowNumber(error.rowId)}, column ${error.column + 1}`;
    const cellKey = toCellKey(error);
    if (plantedCells.has(cellKey)) {
      mismatches.push(`${cell} carries more than one planted error.`);
    }
    plantedCells.add(cellKey);

    const actual = dataset.rows[error.rowId]?.[error.column];
    if (actual === undefined) {
      mismatches.push(`${cell} is not in the file.`);
    } else if (actual !== error.corruptedValue) {
      const expected = JSON.stringify(error.corruptedValue);
      mismatches.push(
        `${cell} holds ${JSON.stringify(actual)}, not the planted ${expected}.`
      );
    }
  }

  return mismatches;
}
