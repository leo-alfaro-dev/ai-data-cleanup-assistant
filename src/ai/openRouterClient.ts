import 'server-only';
import OpenAI, {
  APIConnectionError,
  APIConnectionTimeoutError,
  APIError,
  APIUserAbortError,
} from 'openai';
import { tryCatch } from '@/lib/tryCatch';
import type { AiClient } from './aiClient';
import type { AiClientFailure } from './aiClientFailure';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

// No SDK retries: every call is one record with its own cost, and the caller decides about a retry.
export function createOpenRouterClient({
  apiKey,
  fetch,
}: {
  apiKey: string;
  fetch?: typeof globalThis.fetch;
}): AiClient {
  const sdk = new OpenAI({
    apiKey,
    baseURL: OPENROUTER_BASE_URL,
    fetch,
    maxRetries: 0,
    defaultHeaders: { 'X-Title': 'AI Data Cleanup Assistant' },
  });

  return {
    async createChatCompletion({ body, signal, timeoutMs }) {
      const { result, error } = await tryCatch(() =>
        sdk.post<unknown>('/chat/completions', {
          body,
          signal,
          timeout: timeoutMs,
        })
      );
      if (error) return { ok: false, failure: toClientFailure(error) };

      return { ok: true, reply: result };
    },
  };
}

function toClientFailure(error: unknown): AiClientFailure {
  if (error instanceof APIUserAbortError) return { kind: 'aborted' };
  if (error instanceof APIConnectionTimeoutError) return { kind: 'timeout' };
  if (error instanceof APIConnectionError) return { kind: 'network' };
  if (error instanceof APIError && error.status !== undefined) {
    // The SDK keeps the inner object; the body OpenRouter sent wraps it in `error`.
    return {
      kind: 'http',
      status: error.status,
      payload: { error: error.error },
    };
  }

  return { kind: 'network' };
}
