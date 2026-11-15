import type { Dataset } from '@/engine/dataset/dataset';
import type { Issue } from '@/engine/issues/issue';
import type { ColumnProfile } from '@/engine/profile/columnProfile';
import type { Check } from './check';
import { CHECKS } from './checks';

export function runChecks({
  dataset,
  profile,
  checks = CHECKS,
}: {
  dataset: Dataset;
  profile: readonly ColumnProfile[];
  checks?: readonly Check[];
}): Issue[] {
  return checks.flatMap((check) => check.find({ dataset, profile }));
}
