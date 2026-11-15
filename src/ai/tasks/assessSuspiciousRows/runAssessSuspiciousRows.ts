import 'server-only';
import type { AiClient } from '../../aiClient';
import type { AiTaskOutcome } from '../../aiTaskOutcome';
import { runStructuredCompletion } from '../../runStructuredCompletion';
import { buildAssessSuspiciousRowsPrompt } from './buildAssessSuspiciousRowsPrompt';
import type {
  AssessSuspiciousRowsRequest,
  AssessSuspiciousRowsResult,
} from './assessSuspiciousRowsContract';
import {
  MAX_REPLY_TOKENS,
  assessSuspiciousRowsReply,
} from './assessSuspiciousRowsContract';
import { validateAssessSuspiciousRows } from './validateAssessSuspiciousRows';

export async function runAssessSuspiciousRows({
  client,
  model,
  request,
  signal,
}: {
  client: AiClient;
  model: string;
  request: AssessSuspiciousRowsRequest;
  signal?: AbortSignal;
}): Promise<AiTaskOutcome<AssessSuspiciousRowsResult>> {
  const completion = await runStructuredCompletion({
    client,
    task: 'assessSuspiciousRows',
    model,
    messages: buildAssessSuspiciousRowsPrompt(request),
    schema: assessSuspiciousRowsReply,
    schemaName: 'assess_suspicious_rows',
    maxTokens: MAX_REPLY_TOKENS,
    signal,
  });
  if (!completion.ok) {
    return { ok: false, reason: completion.reason, calls: completion.calls };
  }

  return {
    ok: true,
    result: validateAssessSuspiciousRows({ request, reply: completion.value }),
    calls: completion.calls,
  };
}
