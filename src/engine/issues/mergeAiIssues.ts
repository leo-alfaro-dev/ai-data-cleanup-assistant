import { normalizeWhitespace } from '@/engine/values/normalizeWhitespace';
import type { Issue, IssueId } from './issue';
import type { Coverage } from './listCoverage';
import { listCoverage } from './listCoverage';

/**
 * Check issues and AI issues in one list. An AI issue absorbs a check issue whose every mapped
 * value it maps too, or whose merged rows it merges too, so one value or row never has two
 * competing suggestions. An AI assessment of a single cell adds nothing where another issue
 * already covers that cell, so it is left out. A check issue that is already decided stays, and
 * so does one the AI covers only in part. A rejected AI issue absorbs nothing.
 */
export function mergeAiIssues({
  checkIssues,
  aiIssues,
  isDecided,
  isRejected,
}: {
  checkIssues: readonly Issue[];
  aiIssues: readonly Issue[];
  isDecided: (issueId: IssueId) => boolean;
  isRejected: (issueId: IssueId) => boolean;
}): readonly Issue[] {
  if (aiIssues.length === 0) return checkIssues;

  const coverage = listCoverage(aiIssues.filter(({ id }) => !isRejected(id)));
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
  if (suggestion?.kind !== 'mapValues') return false;

  const values = coverage.mappedValues.get(suggestion.column);
  if (!values) return false;

  return suggestion.groups.every(({ variants }) =>
    variants.every((variant) => values.has(normalizeWhitespace(variant)))
  );
}
