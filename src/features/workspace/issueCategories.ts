import type { IconType } from 'react-icons';
import {
  RxCopy,
  RxDividerHorizontal,
  RxExclamationTriangle,
  RxShuffle,
} from 'react-icons/rx';
import type { IssueCategory } from '@/engine/issues/issue';

export const issueCategories: Record<
  IssueCategory,
  { label: string; icon: IconType }
> = {
  duplicate: { label: 'Duplicates', icon: RxCopy },
  inconsistent: { label: 'Inconsistent values', icon: RxShuffle },
  missing: { label: 'Missing data', icon: RxDividerHorizontal },
  suspicious: { label: 'Suspicious records', icon: RxExclamationTriangle },
};
