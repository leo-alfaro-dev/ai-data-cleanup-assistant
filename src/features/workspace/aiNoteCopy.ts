import type { AiNote } from '@/engine/issues/aiNote';
import { formatNumber } from '@/lib/formatNumber';

// One line for an issue's card: what the AI made of the rows of it that it reviewed.
export function describeAiNotes({
  notes,
  rowCount,
}: {
  notes: readonly AiNote[];
  rowCount: number;
}): string | null {
  if (notes.length === 0) return null;

  const suspicious = notes.filter(({ isSuspicious }) => isSuspicious).length;
  const reviewed = formatNumber(notes.length);
  const isEveryRowReviewed = notes.length >= rowCount;
  if (isEveryRowReviewed) {
    return suspicious === 0
      ? 'AI found it plausible'
      : `AI: ${formatNumber(suspicious)} of ${reviewed} rows suspicious`;
  }

  const reviewedOf = `AI reviewed ${reviewed} of ${formatNumber(rowCount)} rows`;

  return suspicious === 0
    ? `${reviewedOf}, all plausible`
    : `${reviewedOf}, ${formatNumber(suspicious)} suspicious`;
}
