export const AI_TASK_NAMES = [
  'normalizeValues',
  'confirmDuplicates',
  'assessSuspiciousRows',
] as const;

export type AiTaskName = (typeof AI_TASK_NAMES)[number];
