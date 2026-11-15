import type { ChangeOrigin } from '@/engine/changes/changeOrigin';
import type { ColumnKey, RowId, TextEncoding } from '@/engine/dataset/dataset';

export type ChangeLogEntry =
  | {
      kind: 'encodingConverted';
      from: Exclude<TextEncoding, 'utf-8'>;
      to: 'utf-8';
    }
  | {
      kind: 'cellChanged';
      rowId: RowId;
      column: ColumnKey;
      before: string;
      after: string;
      origin: ChangeOrigin;
    }
  | { kind: 'rowRemoved'; rowId: RowId; origin: ChangeOrigin };
