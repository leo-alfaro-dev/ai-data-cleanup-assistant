import type { Dataset } from '@/engine/dataset/dataset';
import type { IssueCategory } from '@/engine/issues/issue';
import type { Truth } from '../corrupt/truth';
import type { CategoryScore } from './categoryScore';
import { indexTruth } from './indexTruth';
import { scoreDuplicates } from './scoreDuplicates';
import type { ScoredIssue } from './scoredIssue';
import { scoreValueCategory } from './scoreValueCategory';

/**
 * Items are cells in the value categories and rows in duplicates. A claim is an item an issue
 * covers, counted once however many issues cover it. Precision is correct claims over claims;
 * recall is found planted items over planted items.
 */
export function scoreIssues({
  issues,
  truth,
  dataset,
}: {
  issues: readonly ScoredIssue[];
  truth: Truth;
  dataset: Dataset;
}): Record<IssueCategory, CategoryScore> {
  const index = indexTruth(truth);

  return {
    duplicate: scoreDuplicates({ issues, index, dataset }),
    inconsistent: scoreValueCategory({
      category: 'inconsistent',
      issues,
      index,
      dataset,
    }),
    missing: scoreValueCategory({
      category: 'missing',
      issues,
      index,
      dataset,
    }),
    suspicious: scoreValueCategory({
      category: 'suspicious',
      issues,
      index,
      dataset,
    }),
  };
}
