import { createAiRoute } from '@/ai/createAiRoute';
import { normalizeValuesRequest } from '@/ai/tasks/normalizeValues/normalizeValuesContract';
import { runNormalizeValues } from '@/ai/tasks/normalizeValues/runNormalizeValues';

export const maxDuration = 60;

export const POST = createAiRoute({
  task: 'normalizeValues',
  requestSchema: normalizeValuesRequest,
  run: runNormalizeValues,
});
