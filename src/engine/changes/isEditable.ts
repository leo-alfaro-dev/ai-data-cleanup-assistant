import type { Change } from './change';

export function isEditable(change: Change | null): change is Change {
  return (
    change?.kind === 'mapValues' ||
    change?.kind === 'mergeRows' ||
    change?.kind === 'setCells'
  );
}
