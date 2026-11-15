import type { Change } from '@/engine/changes/change';
import type { CleanedCell } from '@/engine/changes/cleanedCell';
import { origin } from './origin';

export function changed({
  value,
  issue,
  kind,
}: {
  value: string;
  issue: string;
  kind: Change['kind'];
}): CleanedCell {
  return { isChanged: true, value, origin: origin({ issue, kind }) };
}
