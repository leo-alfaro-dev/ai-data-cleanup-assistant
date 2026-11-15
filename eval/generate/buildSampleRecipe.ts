import { isRule } from '@/engine/changes/isRule';
import { runChecks } from '@/engine/checks/runChecks';
import { decodeText } from '@/engine/dataset/decodeText';
import { parseCsv } from '@/engine/dataset/parseCsv';
import { profileDataset } from '@/engine/profile/profileDataset';
import { buildRecipe } from '@/engine/recipe/buildRecipe';
import { serializeRecipe } from '@/engine/recipe/serializeRecipe';

// Fixed, so the committed recipe only changes when the generator does.
const SAMPLE_RECIPE_CREATED_AT = '2025-06-01T00:00:00.000Z';

/** The recipe a reviewer would export after accepting every certain or high rule the checks suggest. */
export function buildSampleRecipe({
  csv,
  fileName,
}: {
  csv: string;
  fileName: string;
}): string {
  const parsed = parseCsv(decodeText(new TextEncoder().encode(csv)));
  if (!parsed.ok) throw new Error(`The sample did not parse: ${parsed.reason}`);

  const { dataset } = parsed;
  const issues = runChecks({ dataset, profile: profileDataset(dataset) });
  const accepted = issues.flatMap(({ id, confidence, suggestion }) =>
    suggestion &&
    isRule(suggestion) &&
    (confidence === 'certain' || confidence === 'high')
      ? [{ issueId: id, change: suggestion }]
      : []
  );

  return serializeRecipe(
    buildRecipe({
      accepted,
      columns: dataset.columns,
      rowCount: dataset.rows.length,
      fileName,
      createdAt: SAMPLE_RECIPE_CREATED_AT,
    })
  );
}
