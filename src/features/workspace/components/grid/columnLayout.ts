import type { Column } from '@/engine/dataset/dataset';

export type ColumnLayout = {
  column: Column;
  left: number;
  width: number;
  isNumeric: boolean;
};
