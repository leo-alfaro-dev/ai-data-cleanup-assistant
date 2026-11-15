import type { RowId } from '@/engine/dataset/dataset';
import type { PlantedValueError } from './plantedValueError';

export type TruthIndex = {
  // Value claims and suggested cells inside these rows are not scored: a near copy's blanked or
  // re-cased cell is part of the duplicate, so reporting it must not count as a false alarm.
  copyRows: ReadonlySet<RowId>;
  duplicateRows: ReadonlySet<RowId>;
  valueErrors: ReadonlyMap<string, PlantedValueError>;
};
