import type { Placement } from './placement';

export function findPosition({
  placements,
  customerIndex,
}: {
  placements: readonly Placement[];
  customerIndex: number;
}): number {
  return placements.findIndex(
    (placement) =>
      placement.type === 'customer' && placement.customerIndex === customerIndex
  );
}
