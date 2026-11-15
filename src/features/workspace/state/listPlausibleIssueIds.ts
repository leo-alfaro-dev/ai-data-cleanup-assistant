import type { RowId } from '@/engine/dataset/dataset';
import type { AiNote } from '@/engine/issues/aiNote';
import type { Issue, IssueId } from '@/engine/issues/issue';

// The issues whose every row the AI reviewed and found plausible. A partly reviewed issue may
// still hold a row that is not.
export function listPlausibleIssueIds({
  issues,
  notes,
}: {
  issues: readonly Issue[];
  notes: readonly AiNote[];
}): ReadonlySet<IssueId> {
  const reviewed = new Map<
    IssueId,
    { rows: Set<RowId>; hasSuspicious: boolean }
  >();
  for (const { issueId, rowId, isSuspicious } of notes) {
    const entry = reviewed.get(issueId) ?? {
      rows: new Set<RowId>(),
      hasSuspicious: false,
    };
    entry.rows.add(rowId);
    entry.hasSuspicious ||= isSuspicious;
    reviewed.set(issueId, entry);
  }

  return new Set(
    issues
      .filter(({ id, rows }) => {
        const entry = reviewed.get(id);

        return (
          entry !== undefined &&
          !entry.hasSuspicious &&
          rows.length > 0 &&
          rows.every((rowId) => entry.rows.has(rowId))
        );
      })
      .map(({ id }) => id)
  );
}
