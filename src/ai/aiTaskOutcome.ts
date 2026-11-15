import type { AiCallRecord } from './aiCallRecord';
import type { AiFailureReason } from './aiFailureReason';

export type AiTaskOutcome<Result> =
  | { ok: true; result: Result; calls: AiCallRecord[] }
  | { ok: false; reason: AiFailureReason; calls: AiCallRecord[] };
