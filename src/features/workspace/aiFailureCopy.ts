import type { AiFailureReason } from '@/ai/aiFailureReason';
import {
  HOSTED_REQUESTS_PER_WINDOW,
  HOSTED_WINDOW_MS,
} from '@/ai/hostedRequestLimit';

const WINDOW_MINUTES = HOSTED_WINDOW_MS / 60_000;

export const aiFailureCopy: Record<AiFailureReason, string> = {
  invalidRequest: 'The request was not valid, so nothing was sent.',
  aiNotConfigured:
    'No OpenRouter key is set, so the AI cannot run. The checks still work.',
  invalidKey: 'The OpenRouter key was rejected.',
  budgetExhausted: 'The AI budget is used up. The checks still work.',
  rateLimited: `This demo allows ${HOSTED_REQUESTS_PER_WINDOW} AI requests every ${WINDOW_MINUTES} minutes without your own key, and they are used up. The checks still work; the count starts over within ${WINDOW_MINUTES} minutes.`,
  providerRateLimited:
    'OpenRouter or the model’s provider is limiting requests right now. The checks still work; retry in a minute, or choose another model.',
  modelUnavailable: 'The model is not available right now.',
  timeout: 'The model took too long to answer.',
  invalidModelOutput: 'The model did not answer in the expected format.',
  unexpected: 'The AI request failed.',
};
