import { toRowId } from '@/engine/dataset/toRowId';
import { toCustomerColumnKey } from '../generate/toCustomerColumnKey';
import { findPosition } from './findPosition';
import type { Placement } from './placement';
import type { PlantedValue } from './plantedValue';
import type { PlantedError } from './truth';

export function toPlantedErrors({
  placements,
  plantedValues,
}: {
  placements: readonly Placement[];
  plantedValues: readonly PlantedValue[];
}): PlantedError[] {
  return [
    ...toDuplicateErrors(placements),
    ...toValueErrors({ placements, plantedValues }),
  ];
}

function toDuplicateErrors(placements: readonly Placement[]): PlantedError[] {
  return placements.flatMap((placement, position): PlantedError[] => {
    if (placement.type === 'customer') return [];

    const original = findPosition({
      placements,
      customerIndex: placement.originalIndex,
    });

    return [
      {
        category: 'duplicate',
        kind: placement.kind,
        original: toRowId(original),
        copy: toRowId(position),
      },
    ];
  });
}

function toValueErrors({
  placements,
  plantedValues,
}: {
  placements: readonly Placement[];
  plantedValues: readonly PlantedValue[];
}): PlantedError[] {
  return plantedValues.map(
    ({ customerIndex, label, column, cleanValue, corruptedValue }) => ({
      ...label,
      rowId: toRowId(findPosition({ placements, customerIndex })),
      column: toCustomerColumnKey(column),
      cleanValue,
      corruptedValue,
    })
  );
}
