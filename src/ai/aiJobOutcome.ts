import type { AiCallRecord } from './aiCallRecord';
import type { AiFailureReason } from './aiFailureReason';
import type { AiTaskResult } from './aiTaskResult';

// How one request to one route ended, as the browser reads it.
export type AiJobOutcome =
  | { ok: true; taskResult: AiTaskResult; calls: AiCallRecord[] }
  | { ok: false; reason: AiFailureReason; calls: AiCallRecord[] };
