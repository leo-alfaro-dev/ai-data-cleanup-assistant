import type { CheckId } from './check';

export function toCheckId(value: string): CheckId {
  return value as CheckId;
}
