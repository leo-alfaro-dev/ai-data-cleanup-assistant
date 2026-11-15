import type { ChangeOrigin } from './changeOrigin';

export type CleanedCell =
  | { isChanged: false; value: string }
  | { isChanged: true; value: string; origin: ChangeOrigin };
