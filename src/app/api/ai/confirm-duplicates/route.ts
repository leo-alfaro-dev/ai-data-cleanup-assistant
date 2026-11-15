import { createAiRoute } from '@/ai/createAiRoute';
import { confirmDuplicatesRequest } from '@/ai/tasks/confirmDuplicates/confirmDuplicatesContract';
import { runConfirmDuplicates } from '@/ai/tasks/confirmDuplicates/runConfirmDuplicates';

export const maxDuration = 60;

export const POST = createAiRoute({
  task: 'confirmDuplicates',
  requestSchema: confirmDuplicatesRequest,
  run: runConfirmDuplicates,
});
