import type { RowId } from '@/engine/dataset/dataset';
import type { Truth } from '../corrupt/truth';
import type { PlantedValueError } from './plantedValueError';
import { toCellKey } from './toCellKey';
import type { TruthIndex } from './truthIndex';

export function indexTruth(truth: Truth): TruthIndex {
  const copyRows = new Set<RowId>();
  const duplicateRows = new Set<RowId>();
  const valueErrors = new Map<string, PlantedValueError>();

  for (const error of truth.errors) {
    if (error.category !== 'duplicate') {
      valueErrors.set(toCellKey(error), error);
      continue;
    }

    copyRows.add(error.copy);
    duplicateRows.add(error.original);
    duplicateRows.add(error.copy);
  }

  return { copyRows, duplicateRows, valueErrors };
}
