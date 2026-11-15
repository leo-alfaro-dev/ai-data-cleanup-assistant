import type { ColumnKey, RowId } from '@/engine/dataset/dataset';
import { applyColumnRules } from './applyColumnRules';
import type { CleanedCell } from './cleanedCell';
import type { CleanPlan, Replacement } from './cleanPlan';

// Rules read the cell's base value, never another rule's output. A merge that fills the cell
// supplies that base and stays responsible for the cell.
export function cleanCell({
  plan,
  rowId,
  column,
  value,
}: {
  plan: CleanPlan;
  rowId: RowId;
  column: ColumnKey;
  value: string;
}): CleanedCell {
  const explicit = plan.explicitCells.get(rowId)?.get(column);
  if (explicit) {
    return toCleanedCell({ original: value, replacement: explicit });
  }

  const filled = plan.filledCells.get(rowId)?.get(column);
  const merged = filled && filled.value !== value ? filled : null;
  const base = merged ? merged.value : value;

  const rules = plan.columnRules[column];
  const ruled = rules ? applyColumnRules({ rules, base }) : null;
  if (!ruled) return toCleanedCell({ original: value, replacement: merged });

  const origin = merged ? merged.origin : ruled.origin;
  const replacement = { value: ruled.value, origin };

  return toCleanedCell({ original: value, replacement });
}

function toCleanedCell({
  original,
  replacement,
}: {
  original: string;
  replacement: Replacement | null;
}): CleanedCell {
  if (!replacement || replacement.value === original) {
    return { isChanged: false, value: original };
  }

  return {
    isChanged: true,
    value: replacement.value,
    origin: replacement.origin,
  };
}
