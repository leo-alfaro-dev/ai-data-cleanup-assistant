import type { AssessSuspiciousRowsRequest } from './tasks/assessSuspiciousRows/assessSuspiciousRowsContract';
import type { ConfirmDuplicatesRequest } from './tasks/confirmDuplicates/confirmDuplicatesContract';
import type { NormalizeValuesRequest } from './tasks/normalizeValues/normalizeValuesContract';

// One request to one route, tagged with its task so the reply is read with the right contract.
export type AiJobRequest =
  | { task: 'normalizeValues'; request: NormalizeValuesRequest }
  | { task: 'confirmDuplicates'; request: ConfirmDuplicatesRequest }
  | { task: 'assessSuspiciousRows'; request: AssessSuspiciousRowsRequest };
