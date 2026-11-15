import type { Brand } from '@/lib/brand';

export type RunId = Brand<number, 'RunId'>;

export function toRunId(value: number): RunId {
  return value as RunId;
}
