import type { AiFailureReason } from '@/ai/aiFailureReason';

const OFFERED_FOR: readonly AiFailureReason[] = [
  'budgetExhausted',
  'rateLimited',
];

/** The offer to use the visitor's own key, for the failures it can fix. */
export function ownKeyOffer(reason: AiFailureReason): string | null {
  return OFFERED_FOR.includes(reason)
    ? 'You can use your own OpenRouter key.'
    : null;
}
