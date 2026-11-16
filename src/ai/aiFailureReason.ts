export const AI_FAILURE_REASONS = [
  'invalidRequest',
  'aiNotConfigured',
  'invalidKey',
  'budgetExhausted',
  'rateLimited',
  'providerRateLimited',
  'modelUnavailable',
  'timeout',
  'invalidModelOutput',
  'unexpected',
] as const;

export type AiFailureReason = (typeof AI_FAILURE_REASONS)[number];
