import type { AssessSuspiciousRowsRequest } from './tasks/assessSuspiciousRows/assessSuspiciousRowsContract';
import type { ConfirmDuplicatesRequest } from './tasks/confirmDuplicates/confirmDuplicatesContract';
import type { NormalizeValuesRequest } from './tasks/normalizeValues/normalizeValuesContract';

// Every request of a file, already capped: what the worker builds and the page forwards.
export type AiRequests = {
  normalizeValues: NormalizeValuesRequest[];
  confirmDuplicates: ConfirmDuplicatesRequest[];
  assessSuspiciousRows: AssessSuspiciousRowsRequest[];
};
