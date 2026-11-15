import type { PlantedError } from '../corrupt/truth';

export type PlantedValueError = Exclude<
  PlantedError,
  { category: 'duplicate' }
>;
