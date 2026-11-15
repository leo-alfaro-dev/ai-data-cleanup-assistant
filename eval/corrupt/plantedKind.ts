import type { PlantedError } from './truth';

export type PlantedKind<Category extends PlantedError['category']> = Extract<
  PlantedError,
  { category: Category }
>['kind'];
