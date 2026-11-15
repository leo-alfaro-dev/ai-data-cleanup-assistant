import { cleanCell } from '@/engine/changes/cleanCell';
import type { CleanPlan } from '@/engine/changes/cleanPlan';
import type { Dataset } from '@/engine/dataset/dataset';
import { toColumnKey } from '@/engine/dataset/toColumnKey';
import { toRowId } from '@/engine/dataset/toRowId';
import { createCsvWriter } from './createCsvWriter';

export function exportCsv({
  dataset,
  plan,
}: {
  dataset: Dataset;
  plan: CleanPlan;
}): string {
  const writer = createCsvWriter(dataset.format);
  const lines = [writer.toLine(dataset.columns.map(({ header }) => header))];

  dataset.rows.forEach((row, rowIndex) => {
    const rowId = toRowId(rowIndex);
    if (plan.removedRows.has(rowId)) return;

    const values = row.map(
      (value, columnIndex) =>
        cleanCell({ plan, rowId, column: toColumnKey(columnIndex), value })
          .value
    );
    lines.push(writer.toLine(values));
  });

  return writer.toText(lines);
}
