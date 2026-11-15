import 'server-only';
import { z } from 'zod';
import { tryCatch } from '@/lib/tryCatch';
import type { AiClient } from './aiClient';
import type { AiFailureReason } from './aiFailureReason';
import { AI_FAILURE_STATUS } from './aiFailureStatus';
import type { AiModelId } from './models';
import { OWN_KEY_HEADER } from './ownKeyHeader';
import { isAiModelId } from './models';
import { createOpenRouterClient } from './openRouterClient';
import type { AiTaskOutcome } from './aiTaskOutcome';
import type { RateLimiter } from './rateLimiter';
import { hostedRateLimiter } from './rateLimiter';
import { readVisitorAddress } from './readVisitorAddress';

// Closed by the client, which is no longer listening for an answer.
const CLIENT_CLOSED_STATUS = 499;

/** The handler every `/api/ai/<task-name>` route exports: the route itself stays an adapter. */
export function createAiRoute<Payload, Result>({
  task,
  requestSchema,
  run,
  createClient = createOpenRouterClient,
  rateLimiter = hostedRateLimiter,
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
  rateLimiter?: RateLimiter;
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

    const visitorKey = request.headers.get(OWN_KEY_HEADER)?.trim();
    const apiKey = visitorKey || process.env.OPENROUTER_API_KEY;
    if (!apiKey) return fail('aiNotConfigured');

    const isWithinLimit =
      Boolean(visitorKey) ||
      rateLimiter.take(readVisitorAddress(request.headers));
    if (!isWithinLimit) return fail('rateLimited');

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
