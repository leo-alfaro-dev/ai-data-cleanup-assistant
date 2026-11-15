import type { Dataset } from '@/engine/dataset/dataset';
import type { Issue } from '@/engine/issues/issue';
import { acceptSuggestions } from './acceptSuggestions';
import { cleanEveryCell } from './cleanEveryCell';

export function listChangedRows({
  dataset,
  issues,
}: {
  dataset: Dataset;
  issues: readonly Issue[];
}): number[] {
  const cleaned = cleanEveryCell({
    dataset,
    accepted: acceptSuggestions(issues),
  });

  return cleaned.flatMap((row, index) =>
    row.some((cell) => cell.isChanged) ? [index] : []
  );
}
