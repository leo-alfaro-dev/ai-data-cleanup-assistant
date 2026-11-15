import type { Dataset } from '@/engine/dataset/dataset';
import type { AiNote } from '@/engine/issues/aiNote';
import type { Issue } from '@/engine/issues/issue';
import type { AiTaskResult } from './aiTaskResult';
import { toAssessSuspiciousRowsIssues } from './tasks/assessSuspiciousRows/toAssessSuspiciousRowsIssues';
import { toConfirmDuplicatesIssues } from './tasks/confirmDuplicates/toConfirmDuplicatesIssues';
import { toNormalizeValuesIssues } from './tasks/normalizeValues/toNormalizeValuesIssues';

export function toTaskIssues({
  taskResult,
  dataset,
}: {
  taskResult: AiTaskResult;
  dataset: Pick<Dataset, 'rows'>;
}): { issues: Issue[]; notes: AiNote[] } {
  switch (taskResult.task) {
    case 'normalizeValues':
      return {
        issues: toNormalizeValuesIssues({ result: taskResult.result, dataset }),
        notes: [],
      };
    case 'confirmDuplicates':
      return {
        issues: toConfirmDuplicatesIssues({
          result: taskResult.result,
          dataset,
        }),
        notes: [],
      };
    case 'assessSuspiciousRows':
      return toAssessSuspiciousRowsIssues({
        result: taskResult.result,
        dataset,
      });
  }
}
