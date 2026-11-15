import { cleanCell } from '@/engine/changes/cleanCell';
import type { CleanPlan } from '@/engine/changes/cleanPlan';
import type { Dataset } from '@/engine/dataset/dataset';
import { toColumnKey } from '@/engine/dataset/toColumnKey';
import { toRowId } from '@/engine/dataset/toRowId';
import type { ChangeLogEntry } from './changeLogEntry';

// Entries are produced as they are read, so a log of every cell never sits in memory. A generator
// is consumed once; build another to read the log again.
export function* buildChangeLog({
  dataset,
  plan,
}: {
  dataset: Dataset;
  plan: CleanPlan;
}): Generator<ChangeLogEntry> {
  const { encoding } = dataset.format;
  if (encoding !== 'utf-8') {
    yield { kind: 'encodingConverted', from: encoding, to: 'utf-8' };
  }

  for (const [rowIndex, row] of dataset.rows.entries()) {
    const rowId = toRowId(rowIndex);
    const removal = plan.removedRows.get(rowId);
    if (removal) {
      yield { kind: 'rowRemoved', rowId, origin: removal };
      continue;
    }

    for (const [columnIndex, before] of row.entries()) {
      const column = toColumnKey(columnIndex);
      const cleaned = cleanCell({ plan, rowId, column, value: before });
      if (!cleaned.isChanged) continue;

      yield {
        kind: 'cellChanged',
        rowId,
        column,
        before,
        after: cleaned.value,
        origin: cleaned.origin,
      };
    }
  }
}
