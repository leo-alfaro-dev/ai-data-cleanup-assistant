import type { AiClientFailure } from './aiClientFailure';

export type AiClient = {
  // The body is sent as given and the reply comes back unparsed: both sides are validated by the caller.
  createChatCompletion: (request: {
    body: Record<string, unknown>;
    signal?: AbortSignal;
    timeoutMs: number;
  }) => Promise<
    { ok: true; reply: unknown } | { ok: false; failure: AiClientFailure }
  >;
};
