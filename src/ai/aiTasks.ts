import type { AiTaskName } from './aiTaskName';
import type { AiTaskResult } from './aiTaskResult';
import { assessSuspiciousRowsResult } from './tasks/assessSuspiciousRows/assessSuspiciousRowsContract';
import { confirmDuplicatesResult } from './tasks/confirmDuplicates/confirmDuplicatesContract';
import { normalizeValuesResult } from './tasks/normalizeValues/normalizeValuesContract';

// What the browser needs to call a task and to read its reply with the task's own contract.
export const AI_TASKS: Record<
  AiTaskName,
  { path: string; parseResult: (value: unknown) => AiTaskResult | null }
> = {
  normalizeValues: {
    path: '/api/ai/normalize-values',
    parseResult: (value) => {
      const parsed = normalizeValuesResult.safeParse(value);

      return parsed.success
        ? { task: 'normalizeValues', result: parsed.data }
        : null;
    },
  },
  confirmDuplicates: {
    path: '/api/ai/confirm-duplicates',
    parseResult: (value) => {
      const parsed = confirmDuplicatesResult.safeParse(value);

      return parsed.success
        ? { task: 'confirmDuplicates', result: parsed.data }
        : null;
    },
  },
  assessSuspiciousRows: {
    path: '/api/ai/assess-suspicious-rows',
    parseResult: (value) => {
      const parsed = assessSuspiciousRowsResult.safeParse(value);

      return parsed.success
        ? { task: 'assessSuspiciousRows', result: parsed.data }
        : null;
    },
  },
};
