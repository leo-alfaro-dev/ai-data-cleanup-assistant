import type { AcceptedChange } from '@/engine/changes/acceptedChange';
import { compileCleanPlan } from '@/engine/changes/compileCleanPlan';
import type { Dataset } from '@/engine/dataset/dataset';
import { buildRecipe } from '@/engine/recipe/buildRecipe';
import { serializeRecipe } from '@/engine/recipe/serializeRecipe';
import { buildChangeLog } from './buildChangeLog';
import type { ChangeLogEntry } from './changeLogEntry';
import type { CleanedFiles } from './cleanedFiles';
import { exportChangeLog } from './exportChangeLog';
import { exportCsv } from './exportCsv';

export function exportCleanedFiles({
  dataset,
  accepted,
  recipeSource,
}: {
  dataset: Dataset;
  accepted: readonly AcceptedChange[];
  recipeSource: { fileName: string; createdAt: string };
}): CleanedFiles {
  const plan = compileCleanPlan({ accepted, dataset });
  const tally = { cellsChanged: 0, rowsRemoved: 0 };
  const changeLog = exportChangeLog({
    dataset,
    entries: countEntries({
      entries: buildChangeLog({ dataset, plan }),
      tally,
    }),
  });

  const recipe = serializeRecipe(
    buildRecipe({
      accepted,
      columns: dataset.columns,
      rowCount: dataset.rows.length,
      ...recipeSource,
    })
  );

  return { csv: exportCsv({ dataset, plan }), changeLog, recipe, ...tally };
}

function* countEntries({
  entries,
  tally,
}: {
  entries: Iterable<ChangeLogEntry>;
  tally: { cellsChanged: number; rowsRemoved: number };
}): Generator<ChangeLogEntry> {
  for (const entry of entries) {
    if (entry.kind === 'cellChanged') tally.cellsChanged += 1;
    if (entry.kind === 'rowRemoved') tally.rowsRemoved += 1;

    yield entry;
  }
}
