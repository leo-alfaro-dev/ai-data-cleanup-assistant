import { MAX_ATTEMPTS } from '@/ai/runStructuredCompletion';
import type { EvalJob } from './evalJob';
import type { ModelPrices } from './modelPrices';

// Fewer characters per token than prose, so the prompt side errs high.
const CHARACTERS_PER_TOKEN = 3;

// The retry's message that quotes the problem, with room for a long validation error.
const CORRECTION_CHARACTERS = 1_000;

export type CostEstimate = {
  minimumCalls: number;
  maximumCalls: number;
  promptTokens: number;
  ceiling: number;
};

/**
 * The most a run can cost: every call fills its reply cap and fails until the last attempt, and
 * each retry sends the prompt, the reply and a correction again. The schema rides on every call.
 * The real cost is read from the provider's usage records, not from this.
 */
export function estimateCost({
  jobs,
  prices,
}: {
  jobs: readonly Pick<
    EvalJob,
    'messages' | 'maxTokens' | 'replySchemaCharacters'
  >[];
  prices: ModelPrices;
}): CostEstimate {
  let promptTokens = 0;
  let ceiling = 0;

  for (const { messages, maxTokens, replySchemaCharacters } of jobs) {
    const characters =
      replySchemaCharacters +
      messages.reduce((sum, { content }) => sum + content.length, 0);
    const prompt = Math.ceil(characters / CHARACTERS_PER_TOKEN);
    const correction = Math.ceil(CORRECTION_CHARACTERS / CHARACTERS_PER_TOKEN);
    promptTokens += prompt;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      const resent = (attempt - 1) * (maxTokens + correction);
      ceiling +=
        (prompt + resent) * prices.promptPerToken +
        maxTokens * prices.completionPerToken;
    }
  }

  return {
    minimumCalls: jobs.length,
    maximumCalls: jobs.length * MAX_ATTEMPTS,
    promptTokens,
    ceiling,
  };
}
