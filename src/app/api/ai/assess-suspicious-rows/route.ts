import { createAiRoute } from '@/ai/createAiRoute';
import { assessSuspiciousRowsRequest } from '@/ai/tasks/assessSuspiciousRows/assessSuspiciousRowsContract';
import { runAssessSuspiciousRows } from '@/ai/tasks/assessSuspiciousRows/runAssessSuspiciousRows';

export const maxDuration = 60;

export const POST = createAiRoute({
  task: 'assessSuspiciousRows',
  requestSchema: assessSuspiciousRowsRequest,
  run: runAssessSuspiciousRows,
});
