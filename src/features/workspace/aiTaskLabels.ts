import type { AiTaskName } from '@/ai/aiTaskName';

export const aiTaskLabels: Record<AiTaskName, string> = {
  normalizeValues: 'Group spellings of one value',
  confirmDuplicates: 'Confirm duplicate rows',
  assessSuspiciousRows: 'Review suspicious rows',
};
