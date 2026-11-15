// Offered models. One joins after a real call showed it accepts the structured request, and
// `yarn eval` then measures how well it answers and what it costs.
export const AI_MODELS = [
  { id: 'google/gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite' },
  { id: 'anthropic/claude-haiku-5.5', label: 'Claude Haiku 5.5' },
] as const;

export type AiModelId = (typeof AI_MODELS)[number]['id'];

// Among the offered models with precision of at least 90% in every category, the highest recall;
// a tie goes to the higher suggestion accuracy, then the lower cost. See eval/results/summary.md.
export const DEFAULT_AI_MODEL_ID: AiModelId = 'google/gemini-2.5-flash-lite';

export function isAiModelId(value: unknown): value is AiModelId {
  return AI_MODELS.some(({ id }) => id === value);
}
