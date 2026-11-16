import type { AiFailureReason } from './aiFailureReason';

export const AI_FAILURE_STATUS: Record<AiFailureReason, number> = {
  invalidRequest: 400,
  aiNotConfigured: 503,
  invalidKey: 401,
  budgetExhausted: 402,
  rateLimited: 429,
  providerRateLimited: 429,
  modelUnavailable: 502,
  timeout: 504,
  invalidModelOutput: 502,
  unexpected: 500,
};
