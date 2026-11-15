import { toComparisonKey } from './toComparisonKey';

export function isPlaceholder(value: string): boolean {
  return PLACEHOLDER_KEYS.has(toComparisonKey(value));
}

// Stands in for a value nobody entered. Placeholders particular to one file are the model's job.
export const PLACEHOLDER_KEYS: ReadonlySet<string> = new Set([
  'n/a',
  'na',
  'null',
  'none',
  'nil',
  '-',
  '--',
  '?',
  'unknown',
  'tbd',
  'missing',
]);
