import 'server-only';
import { z } from 'zod';
import { tryCatch } from '@/lib/tryCatch';
import type { AiClient } from './aiClient';
import type { AiFailureReason } from './aiFailureReason';
import { AI_FAILURE_STATUS } from './aiFailureStatus';
import type { AiModelId } from './models';
import { isAiModelId } from './models';
import { createOpenRouterClient } from './openRouterClient';
import type { AiTaskOutcome } from './aiTaskOutcome';

// Closed by the client, which is no longer listening for an answer.
const CLIENT_CLOSED_STATUS = 499;

/** The handler every `/api/ai/<task-name>` route exports: the route itself stays an adapter. */
export function createAiRoute<Payload, Result>({
  task,
  requestSchema,
  run,
  createClient = createOpenRouterClient,
}: {
  task: string;
  requestSchema: z.ZodType<Payload>;
  run: (args: {
    client: AiClient;
    model: AiModelId;
    request: Payload;
    signal: AbortSignal;
  }) => Promise<AiTaskOutcome<Result>>;
  createClient?: (args: { apiKey: string }) => AiClient;
}): (request: Request) => Promise<Response> {
  const bodySchema = z.object({
    model: z.custom<AiModelId>(isAiModelId),
    request: requestSchema,
  });
  const fail = (reason: AiFailureReason) =>
    Response.json(
      { ok: false, reason, calls: [] },
      { status: AI_FAILURE_STATUS[reason] }
    );

  return async (request) => {
    const { result: json, error: unreadable } = await tryCatch(() =>
      request.json()
    );
    const body = unreadable ? null : bodySchema.safeParse(json);
    if (!body?.success) return fail('invalidRequest');

    const apiKey =
      request.headers.get('x-openrouter-key')?.trim() ||
      process.env.OPENROUTER_API_KEY;
    if (!apiKey) return fail('aiNotConfigured');

    const { result: outcome, error } = await tryCatch(() =>
      run({
        client: createClient({ apiKey }),
        model: body.data.model,
        request: body.data.request,
        signal: request.signal,
      })
    );
    if (error) {
      if (request.signal.aborted) {
        return new Response(null, { status: CLIENT_CLOSED_STATUS });
      }
      console.error('ai-route-failed', task);

      return fail('unexpected');
    }

    if (outcome.ok) {
      return Response.json({
        ok: true,
        result: outcome.result,
        calls: outcome.calls,
      });
    }

    return Response.json(
      { ok: false, reason: outcome.reason, calls: outcome.calls },
      { status: AI_FAILURE_STATUS[outcome.reason] }
    );
  };
}
