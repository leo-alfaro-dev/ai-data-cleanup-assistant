import { shortenValue } from '@/lib/shortenValue';
import { MAX_REASON_LENGTH } from '../../textLimits';
import type {
  ConfirmDuplicatesReply,
  ConfirmDuplicatesRequest,
  ConfirmDuplicatesResult,
} from './confirmDuplicatesContract';

/**
 * Keeps the verdicts that name a pair that was sent, once each, and the column choices that name a
 * column that was sent. A claim is a verdict or a column choice; every one that is left out is
 * counted. A pair judged not a duplicate leaves nothing behind.
 */
export function validateConfirmDuplicates({
  request,
  reply,
}: {
  request: ConfirmDuplicatesRequest;
  reply: ConfirmDuplicatesReply;
}): ConfirmDuplicatesResult {
  const sent = new Map(request.pairs.map((pair) => [pair.id, pair]));
  const answered = new Set<number>();
  const duplicates: ConfirmDuplicatesResult['duplicates'] = [];
  let claimCount = 0;
  let droppedClaims = 0;

  for (const answer of reply.pairs) {
    claimCount += 1 + answer.columnChoices.length;
    const pair = sent.get(answer.id);
    if (!pair || answered.has(answer.id)) {
      droppedClaims += 1 + answer.columnChoices.length;
      continue;
    }

    answered.add(answer.id);
    if (!answer.isDuplicate) continue;

    const chosen = new Set<number>();
    const choices: ConfirmDuplicatesResult['duplicates'][number]['choices'] =
      [];
    for (const choice of answer.columnChoices) {
      const isUsable =
        choice.column >= 0 &&
        choice.column < request.columns.length &&
        !chosen.has(choice.column);
      if (!isUsable) {
        droppedClaims += 1;
        continue;
      }

      chosen.add(choice.column);
      choices.push(choice);
    }

    duplicates.push({
      rows: pair.rows,
      confidence: answer.confidence,
      reason: shortenValue({
        value: answer.reason,
        maxLength: MAX_REASON_LENGTH,
      }),
      keep: answer.keep,
      choices,
    });
  }

  return { duplicates, claimCount, droppedClaims };
}
