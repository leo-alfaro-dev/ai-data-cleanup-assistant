import { vi } from 'vitest';
import type { AiClient } from '../aiClient';
import type { AiClientFailure } from '../aiClientFailure';

type ChatRequest = Parameters<AiClient['createChatCompletion']>[0];

type Answer = { reply: unknown } | { failure: AiClientFailure };

// Answers each call with the next given answer, and keeps the requests it received.
export function createFakeAiClient(...answers: Answer[]): {
  client: AiClient;
  requests: () => Record<string, unknown>[];
  createChatCompletion: ReturnType<
    typeof vi.fn<AiClient['createChatCompletion']>
  >;
} {
  const queue = [...answers];
  const received: Record<string, unknown>[] = [];
  const createChatCompletion = vi.fn(async (request: ChatRequest) => {
    received.push(request.body);
    const answer = queue.shift();
    if (!answer) throw new Error('The fake client has no answer left');

    return 'failure' in answer
      ? { ok: false as const, failure: answer.failure }
      : { ok: true as const, reply: answer.reply };
  });

  return {
    client: { createChatCompletion },
    createChatCompletion,
    requests: () => received,
  };
}

export function completionOf({
  content,
  usage = {
    prompt_tokens: 10,
    completion_tokens: 5,
    total_tokens: 15,
    cost: 0.0001,
  },
}: {
  content: string;
  usage?: Record<string, number> | null;
}): unknown {
  return {
    choices: [
      { message: { role: 'assistant', content }, finish_reason: 'stop' },
    ],
    usage,
  };
}
