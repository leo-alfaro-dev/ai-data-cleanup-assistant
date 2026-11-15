import type { AcceptedChange } from '@/engine/changes/acceptedChange';
import { previewChange } from '@/engine/changes/previewChange';
import type { Dataset } from '@/engine/dataset/dataset';
import { countChanges } from '@/engine/export/countChanges';
import type { Issue } from '@/engine/issues/issue';
import type { Recipe } from './recipe';
import type { ReplayResult, SkippedRule } from './replayResult';
import { toReplayChange } from './toReplayChange';
import { toReplayIssue } from './toReplayIssue';

/**
 * Turns the rules of a recipe into issues on this file. A rule whose column is missing, or that
 * finds nothing to change, is skipped and reported; one rule never fails the others.
 */
export function replayRecipe({
  dataset,
  recipe,
}: {
  dataset: Dataset;
  recipe: Recipe;
}): ReplayResult {
  const issues: Issue[] = [];
  const skipped: SkippedRule[] = [];

  for (const [index, rule] of recipe.rules.entries()) {
    const change = toReplayChange({ rule, dataset });
    if (change === null) {
      skipped.push({ index, rule, reason: 'missingColumn' });
      continue;
    }

    const { counts } = previewChange({ change, dataset });
    if (counts.cells === 0 && counts.removedRows === 0) {
      skipped.push({ index, rule, reason: 'nothingToChange' });
      continue;
    }

    issues.push(toReplayIssue({ index, change }));
  }

  const accepted: AcceptedChange[] = issues.flatMap(({ id, suggestion }) =>
    suggestion ? [{ issueId: id, change: suggestion }] : []
  );

  return { issues, skipped, ...countChanges({ dataset, accepted }) };
}
