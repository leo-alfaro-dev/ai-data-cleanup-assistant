import type { Dataset } from '@/engine/dataset/dataset';
import { toColumnKey } from '@/engine/dataset/toColumnKey';
import { toRowId } from '@/engine/dataset/toRowId';
import type { AiNote } from '@/engine/issues/aiNote';
import type { Issue } from '@/engine/issues/issue';
import { toIssueId } from '@/engine/issues/toIssueId';
import type { AssessSuspiciousRowsResult } from './assessSuspiciousRowsContract';

/**
 * A row a check flagged keeps its check issue and gains a note with what the model said, whether
 * it found the row suspicious or plausible. A sampled row the model finds suspicious becomes a new
 * issue, with a suggested cell value only when the model gave one for a cell that exists.
 */
export function toAssessSuspiciousRowsIssues({
  result,
  dataset,
}: {
  result: AssessSuspiciousRowsResult;
  dataset: Pick<Dataset, 'rows'>;
}): { issues: Issue[]; notes: AiNote[] } {
  const issues: Issue[] = [];
  const notes: AiNote[] = [];

  for (const verdict of result.rows) {
    const rowId = toRowId(verdict.rowId);
    const hasCell =
      verdict.column !== null &&
      dataset.rows[rowId]?.[verdict.column] !== undefined;
    const column =
      hasCell && verdict.column !== null ? toColumnKey(verdict.column) : null;

    if (verdict.flaggedBy.length > 0) {
      for (const issueId of verdict.flaggedBy) {
        notes.push({
          issueId: toIssueId(issueId),
          rowId,
          isSuspicious: verdict.isSuspicious,
          column,
          reason: verdict.reason,
          confidence: verdict.confidence,
          suggestedValue: verdict.suggestedValue,
        });
      }
      continue;
    }
    if (!verdict.isSuspicious) continue;

    issues.push({
      id: toIssueId(`assess-suspicious-rows:${rowId}`),
      category: 'suspicious',
      source: 'ai',
      confidence: verdict.confidence,
      rows: [rowId],
      column,
      suggestion:
        column !== null && verdict.suggestedValue !== null
          ? {
              kind: 'setCells',
              cells: [{ rowId, column, value: verdict.suggestedValue }],
            }
          : null,
      details: { kind: 'assessedRow', reason: verdict.reason },
    });
  }

  return { issues, notes };
}
