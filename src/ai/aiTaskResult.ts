import type { AssessSuspiciousRowsResult } from './tasks/assessSuspiciousRows/assessSuspiciousRowsContract';
import type { ConfirmDuplicatesResult } from './tasks/confirmDuplicates/confirmDuplicatesContract';
import type { NormalizeValuesResult } from './tasks/normalizeValues/normalizeValuesContract';

export type AiTaskResult =
  | { task: 'normalizeValues'; result: NormalizeValuesResult }
  | { task: 'confirmDuplicates'; result: ConfirmDuplicatesResult }
  | { task: 'assessSuspiciousRows'; result: AssessSuspiciousRowsResult };
