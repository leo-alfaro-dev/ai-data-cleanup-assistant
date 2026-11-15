import type { RowId } from '@/engine/dataset/dataset';
import type { IdentifierGroup } from './identifierGroup';

// Rows that look like one record: the first stays, the others would be merged into it.
export type IdentifierRecord = {
  keep: RowId;
  remove: readonly RowId[];
  links: readonly IdentifierGroup[];
};
