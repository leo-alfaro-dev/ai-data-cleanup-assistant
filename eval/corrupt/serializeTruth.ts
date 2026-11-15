import type { Truth } from './truth';

export function serializeTruth(truth: Truth): string {
  return `${JSON.stringify(truth, null, 2)}\n`;
}
