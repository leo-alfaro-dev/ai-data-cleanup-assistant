import type { MatchColumn } from './matchColumn';

// A column where two rows agreeing is evidence they are one record, except on a value many
// rows share.
export type EvidenceColumn = MatchColumn & {
  commonKeys: ReadonlySet<string>;
};
