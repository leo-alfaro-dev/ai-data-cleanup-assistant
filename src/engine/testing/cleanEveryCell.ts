import type { AcceptedChange } from '@/engine/changes/acceptedChange';
import { cleanCell } from '@/engine/changes/cleanCell';
import type { CleanedCell } from '@/engine/changes/cleanedCell';
import { compileCleanPlan } from '@/engine/changes/compileCleanPlan';
import type { Dataset } from '@/engine/dataset/dataset';
import { toColumnKey } from '@/engine/dataset/toColumnKey';
import { toRowId } from '@/engine/dataset/toRowId';

export function cleanEveryCell({
  dataset,
  accepted,
}: {
  dataset: Dataset;
  accepted: readonly AcceptedChange[];
}): CleanedCell[][] {
  const plan = compileCleanPlan({ accepted, dataset });

  return dataset.rows.map((values, rowIndex) =>
    values.map((value, columnIndex) =>
      cleanCell({
        plan,
        rowId: toRowId(rowIndex),
        column: toColumnKey(columnIndex),
        value,
      })
    )
  );
}
