import type { Issue } from '@/engine/issues/issue';

export type ScoredIssue = Pick<
  Issue,
  'category' | 'rows' | 'column' | 'suggestion'
>;
