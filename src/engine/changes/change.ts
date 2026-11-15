import type { ColumnKey, RowId } from '@/engine/dataset/dataset';
import type { DateFormat } from '@/engine/values/dateFormat';

export type Change = Rule | SetCells | MergeRows | RemoveRows;

export type Rule =
  TrimWhitespace | MapValues | StandardizeDates | DropDuplicateRows;

export type TrimWhitespace = {
  kind: 'trimWhitespace';
  column: ColumnKey;
};

// A cell matches a variant by whitespace-normalized form, case included.
export type MapValues = {
  kind: 'mapValues';
  column: ColumnKey;
  groups: readonly ValueGroup[];
};

export type ValueGroup = {
  canonical: string;
  variants: readonly string[];
};

// Only dates that `parseDate` reads with one certain meaning are rewritten.
export type StandardizeDates = {
  kind: 'standardizeDates';
  column: ColumnKey;
  format: DateFormat;
};

export type DuplicateMode = 'exact' | 'normalized';

// The smallest RowId of each group stays and the others are removed.
export type DropDuplicateRows = {
  kind: 'dropDuplicateRows';
  mode: DuplicateMode;
  groups: readonly (readonly RowId[])[];
};

export type SetCells = {
  kind: 'setCells';
  cells: readonly CellValue[];
};

export type CellValue = {
  rowId: RowId;
  column: ColumnKey;
  value: string;
};

// A choice shows the original value of its `from` row in the kept row.
// A choice from the kept row changes nothing.
export type MergeRows = {
  kind: 'mergeRows';
  keep: RowId;
  remove: readonly RowId[];
  values: readonly MergeChoice[];
};

export type MergeChoice = {
  column: ColumnKey;
  from: RowId;
};

export type RemoveRows = {
  kind: 'removeRows';
  rows: readonly RowId[];
};
