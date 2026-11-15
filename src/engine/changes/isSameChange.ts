import type { Change } from './change';

// Changes are plain data, so the same serialization means the same change.
export function isSameChange({
  first,
  second,
}: {
  first: Change;
  second: Change;
}): boolean {
  return first === second || JSON.stringify(first) === JSON.stringify(second);
}
