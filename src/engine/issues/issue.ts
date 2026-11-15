import type { Change } from '@/engine/changes/change';
import type { RowId } from '@/engine/dataset/dataset';
import type { Brand } from '@/lib/brand';
import type { IssueDetails } from './issueDetails';

export type IssueId = Brand<string, 'IssueId'>;

export const ISSUE_CATEGORIES = [
  'duplicate',
  'inconsistent',
  'missing',
  'suspicious',
] as const;

export type IssueCategory = (typeof ISSUE_CATEGORIES)[number];

export type IssueSource = 'check' | 'ai';

export const CONFIDENCES = ['certain', 'high', 'medium', 'low'] as const;

export type Confidence = (typeof CONFIDENCES)[number];

export type Issue = {
  id: IssueId;
  category: IssueCategory;
  source: IssueSource;
  confidence: Confidence;
  rows: readonly RowId[];
  suggestion: Change | null;
  details: IssueDetails;
};
