import { isBlank } from '@/engine/values/isBlank';
import { readFormulaTrigger } from '@/engine/values/readFormulaTrigger';
import { shortenValue } from '@/lib/shortenValue';
import type {
  AssessSuspiciousRowsReply,
  AssessSuspiciousRowsRequest,
  AssessSuspiciousRowsResult,
} from './assessSuspiciousRowsContract';
import { MAX_CELL_LENGTH, MAX_REASON_LENGTH } from '../../textLimits';

/**
 * Keeps the verdicts that name a row that was sent, once each, and a column that was sent. A
 * suggested value stays only with a suspicious verdict that names a column, and only when it is
 * not blank, not too long, not what the cell holds already, and not the start of a formula. A
 * claim is a verdict or a suggested value; every one that is left out is counted.
 */
export function validateAssessSuspiciousRows({
  request,
  reply,
}: {
  request: AssessSuspiciousRowsRequest;
  reply: AssessSuspiciousRowsReply;
}): AssessSuspiciousRowsResult {
  const sent = new Map(request.rows.map((row) => [row.id, row]));
  const answered = new Set<number>();
  const rows: AssessSuspiciousRowsResult['rows'] = [];
  let claimCount = 0;
  let droppedClaims = 0;

  for (const answer of reply.rows) {
    const claims = answer.suggestedValue === null ? 1 : 2;
    claimCount += claims;

    const row = sent.get(answer.id);
    const isColumnSent =
      answer.column === null ||
      (answer.column >= 0 && answer.column < request.columns.length);
    if (!row || answered.has(answer.id) || !isColumnSent) {
      droppedClaims += claims;
      continue;
    }

    answered.add(answer.id);
    const { column, suggestedValue } = answer;
    const isSuggestionAllowed =
      suggestedValue !== null &&
      answer.isSuspicious &&
      column !== null &&
      !isBlank(suggestedValue) &&
      suggestedValue.length <= MAX_CELL_LENGTH &&
      readFormulaTrigger(suggestedValue) === null &&
      suggestedValue !== row.cells[column];
    if (suggestedValue !== null && !isSuggestionAllowed) droppedClaims += 1;

    rows.push({
      rowId: row.rowId,
      flaggedBy: row.flaggedBy,
      isSuspicious: answer.isSuspicious,
      column,
      reason: shortenValue({
        value: answer.reason,
        maxLength: MAX_REASON_LENGTH,
      }),
      confidence: answer.confidence,
      suggestedValue: isSuggestionAllowed ? suggestedValue : null,
    });
  }

  return { rows, claimCount, droppedClaims };
}
