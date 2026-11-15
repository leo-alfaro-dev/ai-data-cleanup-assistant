import type { Change } from './change';
import type { ChangeOrigin } from './changeOrigin';

// Entries are ordered by issue id, and where two want the same slot the first wins.
export type PlanEntry = {
  change: Change;
  origin: ChangeOrigin;
};
