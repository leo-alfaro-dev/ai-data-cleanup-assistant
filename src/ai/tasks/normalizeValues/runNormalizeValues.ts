import 'server-only';
import type { AiClient } from '../../aiClient';
import type { AiTaskOutcome } from '../../aiTaskOutcome';
import { runStructuredCompletion } from '../../runStructuredCompletion';
import { buildNormalizeValuesPrompt } from './buildNormalizeValuesPrompt';
import type {
  NormalizeValuesRequest,
  NormalizeValuesResult,
} from './normalizeValuesContract';
import {
  MAX_REPLY_TOKENS,
  normalizeValuesReply,
} from './normalizeValuesContract';
import { validateNormalizeValues } from './validateNormalizeValues';

export async function runNormalizeValues({
  client,
  model,
  request,
  signal,
}: {
  client: AiClient;
  model: string;
  request: NormalizeValuesRequest;
  signal?: AbortSignal;
}): Promise<AiTaskOutcome<NormalizeValuesResult>> {
  const completion = await runStructuredCompletion({
    client,
    task: 'normalizeValues',
    model,
    messages: buildNormalizeValuesPrompt(request),
    schema: normalizeValuesReply,
    schemaName: 'normalize_values',
    maxTokens: MAX_REPLY_TOKENS,
    signal,
  });
  if (!completion.ok) {
    return { ok: false, reason: completion.reason, calls: completion.calls };
  }

  return {
    ok: true,
    result: validateNormalizeValues({ request, reply: completion.value }),
    calls: completion.calls,
  };
}
