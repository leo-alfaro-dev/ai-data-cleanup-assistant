import { tryCatch } from '@/lib/tryCatch';
import type { AiJobOutcome } from './aiJobOutcome';
import type { AiJobRequest } from './aiJobRequest';
import { aiRouteResponse } from './aiRouteResponse';
import { AI_TASKS } from './aiTasks';
import type { AiModelId } from './models';

/** The body the browser sends, as text, and how the route answered. Nothing is thrown. */
export async function postAiJob({
  job,
  model,
  signal,
}: {
  job: AiJobRequest;
  model: AiModelId;
  signal: AbortSignal;
}): Promise<{ body: string; outcome: AiJobOutcome }> {
  const body = JSON.stringify({ model, request: job.request });
  const { path, parseResult } = AI_TASKS[job.task];
  const { result: response, error } = await tryCatch(() =>
    fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      signal,
    })
  );
  if (error) return { body, outcome: failed('unexpected') };

  const { result: json } = await tryCatch(() => response.json());
  const envelope = aiRouteResponse.safeParse(json);
  if (!envelope.success) {
    return { body, outcome: failed(reasonOfStatus(response.status)) };
  }
  if (!envelope.data.ok) {
    return {
      body,
      outcome: failed(envelope.data.reason, envelope.data.calls),
    };
  }

  const taskResult = parseResult(envelope.data.result);
  if (!taskResult)
    return { body, outcome: failed('unexpected', envelope.data.calls) };

  return {
    body,
    outcome: { ok: true, taskResult, calls: envelope.data.calls },
  };
}

function failed(
  reason: Extract<AiJobOutcome, { ok: false }>['reason'],
  calls: AiJobOutcome['calls'] = []
): AiJobOutcome {
  return { ok: false, reason, calls };
}

// An answer that is not ours, such as a gateway's page, still says something by its status.
function reasonOfStatus(
  status: number
): Extract<AiJobOutcome, { ok: false }>['reason'] {
  if (status === 429) return 'rateLimited';
  if (status === 504) return 'timeout';

  return 'unexpected';
}
