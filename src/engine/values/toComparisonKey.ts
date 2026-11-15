import { normalizeWhitespace } from './normalizeWhitespace';

export function toComparisonKey(value: string): string {
  const normalized = normalizeWhitespace(value);
  const composed = NON_ASCII.test(normalized)
    ? normalized.normalize('NFKC')
    : normalized;

  return composed.toLowerCase();
}

const NON_ASCII = /[\u0080-\uFFFF]/;
