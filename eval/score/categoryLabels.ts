import type { IssueCategory } from '@/engine/issues/issue';

export const CATEGORY_LABELS: Record<IssueCategory, string> = {
  duplicate: 'Duplicates',
  inconsistent: 'Inconsistent values',
  missing: 'Missing data',
  suspicious: 'Suspicious records',
};
