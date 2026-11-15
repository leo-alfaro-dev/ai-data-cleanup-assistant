import type { Dataset } from '@/engine/dataset/dataset';
import type { Issue, IssueCategory } from '@/engine/issues/issue';
import type { ColumnProfile } from '@/engine/profile/columnProfile';
import type { Brand } from '@/lib/brand';

export type CheckId = Brand<string, 'CheckId'>;

export type Check = {
  id: CheckId;
  category: IssueCategory;
  find: (input: {
    dataset: Dataset;
    profile: readonly ColumnProfile[];
  }) => readonly Issue[];
};
