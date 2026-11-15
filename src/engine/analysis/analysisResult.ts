import type { Issue } from '@/engine/issues/issue';
import type { NearDuplicateCandidate } from '@/engine/matching/nearDuplicateCandidate';
import type { ColumnProfile } from '@/engine/profile/columnProfile';

export type AnalysisResult = {
  profile: readonly ColumnProfile[];
  issues: readonly Issue[];
  candidates: readonly NearDuplicateCandidate[];
};
