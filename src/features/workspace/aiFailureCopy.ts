import type { AiFailureReason } from '@/ai/aiFailureReason';

export const aiFailureCopy: Record<AiFailureReason, string> = {
  invalidRequest: 'The request was not valid, so nothing was sent.',
  aiNotConfigured:
    'No OpenRouter key is set, so the AI cannot run. The checks still work.',
  invalidKey: 'The OpenRouter key was rejected.',
  budgetExhausted: 'The AI budget is used up. The checks still work.',
  rateLimited:
    'Too many AI requests right now. The checks still work; try again in a few minutes.',
  modelUnavailable: 'The model is not available right now.',
  timeout: 'The model took too long to answer.',
  invalidModelOutput: 'The model did not answer in the expected format.',
  unexpected: 'The AI request failed.',
};
