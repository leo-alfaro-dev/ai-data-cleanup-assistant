import { normalizeWhitespace } from '@/engine/values/normalizeWhitespace';
import type { Change } from '@/engine/changes/change';
import type { Issue, IssueId } from './issue';
import type { Coverage } from './listCoverage';
import { listCoverage } from './listCoverage';

/**
 * Check issues and AI or recipe issues in one list. An issue absorbs a check issue it covers
 * entirely (mapped values, merged rows, a trim, a date format, a kind of duplicate removal), so
 * nothing has two competing suggestions. Decided check issues and rejected issues never absorb.
 * An AI assessment of a cell that another issue covers is left out.
 */
export function mergeAiIssues({
  checkIssues,
  aiIssues,
  isDecided,
  isRejected,
  changeOf = (issue) => issue.suggestion,
}: {
  checkIssues: readonly Issue[];
  aiIssues: readonly Issue[];
  isDecided: (issueId: IssueId) => boolean;
  isRejected: (issueId: IssueId) => boolean;
  // The change an issue applies as decided: its edit when it has one.
  changeOf?: (issue: Issue) => Change | null;
}): readonly Issue[] {
  if (aiIssues.length === 0) return checkIssues;

  const coverage = listCoverage({
    issues: aiIssues.filter(({ id }) => !isRejected(id)),
    changeOf,
  });
  const kept = checkIssues.filter(
    (issue) => isDecided(issue.id) || !isAbsorbed({ issue, coverage })
  );
  const others = [
    ...kept,
    ...aiIssues.filter(
      ({ id, details }) => details.kind !== 'assessedRow' && !isRejected(id)
    ),
  ];
  const keptAi = aiIssues.filter(
    (issue) =>
      issue.details.kind !== 'assessedRow' ||
      isDecided(issue.id) ||
      !isCellCovered({ issue, others })
  );

  return [...kept, ...keptAi];
}

function isCellCovered({
  issue,
  others,
}: {
  issue: Issue;
  others: readonly Issue[];
}): boolean {
  const [rowId] = issue.rows;
  if (issue.column === null || rowId === undefined) return false;

  return others.some(
    (other) => other.column === issue.column && other.rows.includes(rowId)
  );
}

function isAbsorbed({
  issue,
  coverage,
}: {
  issue: Issue;
  coverage: Coverage;
}): boolean {
  const { suggestion } = issue;
  if (suggestion?.kind === 'mergeRows') {
    return coverage.mergedRows.some((rows) =>
      [suggestion.keep, ...suggestion.remove].every((rowId) => rows.has(rowId))
    );
  }
  if (suggestion?.kind === 'trimWhitespace') {
    return coverage.trimmedColumns.has(suggestion.column);
  }
  if (suggestion?.kind === 'standardizeDates') {
    return (
      coverage.datedColumns.get(suggestion.column)?.has(suggestion.format) ??
      false
    );
  }
  if (suggestion?.kind === 'dropDuplicateRows') {
    return coverage.droppedDuplicates.has(suggestion.mode);
  }
  if (suggestion?.kind !== 'mapValues') return false;

  const values = coverage.mappedValues.get(suggestion.column);
  if (!values) return false;

  return suggestion.groups.every(({ variants }) =>
    variants.every((variant) => values.has(normalizeWhitespace(variant)))
  );
}
