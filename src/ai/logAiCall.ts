import 'server-only';
import type { AiCallRecord } from './aiCallRecord';

// Metadata only: no prompt, no cell value and no key ever reaches a log.
export function logAiCall(record: AiCallRecord): void {
  console.info('ai-call', JSON.stringify(record));
}
