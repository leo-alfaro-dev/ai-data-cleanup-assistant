import 'server-only';
import { z } from 'zod';
import type { AiCallRecord } from './aiCallRecord';
import type { AiClient } from './aiClient';
import type { AiFailureReason } from './aiFailureReason';
import type { AiMessage } from './aiMessage';
import { logAiCall } from './logAiCall';
import { parseStructuredReply } from './parseStructuredReply';
import { toAiFailureReason } from './toAiFailureReason';

export type StructuredResult<Output> =
  | { ok: true; value: Output; calls: AiCallRecord[] }
  | { ok: false; reason: AiFailureReason; calls: AiCallRecord[] };

// Under the routes' maxDuration of 60 seconds, so the failure is ours and carries a reason.
const DEFAULT_DEADLINE_MS = 55_000;

// A retry with less time left than this would only time out.
const MIN_RETRY_MS = 8_000;

export const MAX_ATTEMPTS = 2;

/**
 * Asks for JSON that matches the schema and validates the reply. An invalid reply gets one retry
 * that quotes the problem, if the deadline (shared by all attempts) leaves time. `maxTokens` must
 * leave room for a full reply. An abort rejects, never retries. Every call is recorded.
 */
export async function runStructuredCompletion<Output>({
  client,
  task,
  model,
  messages,
  schema,
  schemaName,
  maxTokens,
  signal,
  deadlineMs = DEFAULT_DEADLINE_MS,
  now = Date.now,
}: {
  client: AiClient;
  task: string;
  model: string;
  messages: readonly AiMessage[];
  schema: z.ZodType<Output>;
  schemaName: string;
  maxTokens: number;
  signal?: AbortSignal;
  deadlineMs?: number;
  now?: () => number;
}): Promise<StructuredResult<Output>> {
  const calls: AiCallRecord[] = [];
  const record = (call: Omit<AiCallRecord, 'task' | 'model'>) => {
    const full = { task, model, ...call };
    calls.push(full);
    logAiCall(full);
  };
  const noUsage = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    cost: null,
  };
  const startedAtRun = now();
  let conversation = [...messages];

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    if (signal?.aborted) throw toAbortError(signal);

    const startedAt = now();
    const remainingMs = deadlineMs - (startedAt - startedAtRun);
    const isRetryStarved = attempt > 1 && remainingMs < MIN_RETRY_MS;
    if (isRetryStarved) break;

    const answer = await client.createChatCompletion({
      body: {
        model,
        messages: conversation,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: schemaName,
            strict: true,
            schema: z.toJSONSchema(schema),
          },
        },
        max_tokens: maxTokens,
        provider: { require_parameters: true },
      },
      signal,
      timeoutMs: remainingMs,
    });
    const latencyMs = now() - startedAt;

    if (!answer.ok) {
      if (answer.failure.kind === 'aborted') throw toAbortError(signal);

      const reason = toAiFailureReason(answer.failure);
      record({ ...noUsage, latencyMs, outcome: reason });

      return { ok: false, reason, calls };
    }

    const parsed = parseStructuredReply({ reply: answer.reply, schema });
    if (parsed.kind === 'error') {
      const reason = toAiFailureReason({
        kind: 'http',
        status: parsed.status,
        payload: answer.reply,
      });
      record({ ...noUsage, latencyMs, outcome: reason });

      return { ok: false, reason, calls };
    }
    if (parsed.kind === 'valid') {
      record({ ...parsed.usage, latencyMs, outcome: 'valid' });

      return { ok: true, value: parsed.value, calls };
    }

    record({ ...parsed.usage, latencyMs, outcome: 'invalidModelOutput' });
    const previousTurn: AiMessage[] =
      parsed.content === ''
        ? []
        : [{ role: 'assistant', content: parsed.content }];
    conversation = [
      ...messages,
      ...previousTurn,
      {
        role: 'user',
        content: `Your reply did not match the required format. ${parsed.problem} Reply again with only JSON that matches the schema.`,
      },
    ];
  }

  return { ok: false, reason: 'invalidModelOutput', calls };
}

function toAbortError(signal: AbortSignal | undefined): unknown {
  return (
    signal?.reason ?? new DOMException('The call was aborted.', 'AbortError')
  );
}
