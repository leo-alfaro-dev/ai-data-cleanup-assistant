// Offered models. One joins after a real call showed it accepts the structured request, and
// `yarn eval` then measures how well it answers and what it costs.
export const AI_MODELS = [
  { id: 'anthropic/claude-haiku-5.5', label: 'Claude Haiku 5.5' },
  { id: 'google/gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite' },
] as const;

export type AiModelId = (typeof AI_MODELS)[number]['id'];

export const DEFAULT_AI_MODEL_ID: AiModelId = 'anthropic/claude-haiku-5.5';

export function isAiModelId(value: unknown): value is AiModelId {
  return AI_MODELS.some(({ id }) => id === value);
}
