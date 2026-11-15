import 'server-only';
import type { AiClient } from '../../aiClient';
import type { AiTaskOutcome } from '../../aiTaskOutcome';
import { runStructuredCompletion } from '../../runStructuredCompletion';
import { buildConfirmDuplicatesPrompt } from './buildConfirmDuplicatesPrompt';
import type {
  ConfirmDuplicatesRequest,
  ConfirmDuplicatesResult,
} from './confirmDuplicatesContract';
import {
  MAX_REPLY_TOKENS,
  confirmDuplicatesReply,
} from './confirmDuplicatesContract';
import { validateConfirmDuplicates } from './validateConfirmDuplicates';

export async function runConfirmDuplicates({
  client,
  model,
  request,
  signal,
}: {
  client: AiClient;
  model: string;
  request: ConfirmDuplicatesRequest;
  signal?: AbortSignal;
}): Promise<AiTaskOutcome<ConfirmDuplicatesResult>> {
  const completion = await runStructuredCompletion({
    client,
    task: 'confirmDuplicates',
    model,
    messages: buildConfirmDuplicatesPrompt(request),
    schema: confirmDuplicatesReply,
    schemaName: 'confirm_duplicates',
    maxTokens: MAX_REPLY_TOKENS,
    signal,
  });
  if (!completion.ok) {
    return { ok: false, reason: completion.reason, calls: completion.calls };
  }

  return {
    ok: true,
    result: validateConfirmDuplicates({ request, reply: completion.value }),
    calls: completion.calls,
  };
}
