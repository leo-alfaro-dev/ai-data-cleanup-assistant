import type { PlantedKind } from './plantedKind';

export type DuplicatePlan = {
  originalIndex: number;
  kind: PlantedKind<'duplicate'>;
};
