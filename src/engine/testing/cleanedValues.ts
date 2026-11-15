import type { Dataset } from '@/engine/dataset/dataset';
import type { Issue } from '@/engine/issues/issue';
import { acceptSuggestions } from './acceptSuggestions';
import { cleanEveryCell } from './cleanEveryCell';

export function cleanedValues({
  dataset,
  issues,
}: {
  dataset: Dataset;
  issues: readonly Issue[];
}): string[][] {
  return cleanEveryCell({ dataset, accepted: acceptSuggestions(issues) }).map(
    (row) => row.map((cell) => cell.value)
  );
}
