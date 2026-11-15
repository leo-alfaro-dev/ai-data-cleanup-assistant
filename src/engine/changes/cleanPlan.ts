import type { ColumnKey, RowId } from '@/engine/dataset/dataset';
import type { DateFormat } from '@/engine/values/dateFormat';
import type { ChangeOrigin } from './changeOrigin';

export type CleanPlan = {
  columnRules: readonly (ColumnRules | null)[];
  explicitCells: CellReplacements;
  filledCells: CellReplacements;
  removedRows: ReadonlyMap<RowId, ChangeOrigin>;
};

export type ColumnRules = {
  dateRule: DateRule | null;
  mapping: ReadonlyMap<string, Replacement> | null;
  trimOrigin: ChangeOrigin | null;
};

export type DateRule = {
  format: DateFormat;
  origin: ChangeOrigin;
};

export type CellReplacements = ReadonlyMap<
  RowId,
  ReadonlyMap<ColumnKey, Replacement>
>;

export type Replacement = {
  value: string;
  origin: ChangeOrigin;
};
