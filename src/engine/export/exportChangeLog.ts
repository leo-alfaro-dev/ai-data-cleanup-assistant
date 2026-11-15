import type { Dataset } from '@/engine/dataset/dataset';
import { toRowNumber } from '@/engine/dataset/toRowNumber';
import type { ChangeLogEntry } from './changeLogEntry';
import { createCsvWriter } from './createCsvWriter';

export function exportChangeLog({
  dataset,
  entries,
}: {
  dataset: Dataset;
  entries: Iterable<ChangeLogEntry>;
}): string {
  const writer = createCsvWriter(dataset.format);
  const lines = [writer.toLine(LOG_HEADER)];

  for (const entry of entries) {
    lines.push(writer.toLine(toLogValues({ entry, dataset })));
  }

  return writer.toText(lines);
}

const LOG_HEADER = [
  'row',
  'column',
  'column_number',
  'action',
  'before',
  'after',
  'change',
  'issue',
];

function toLogValues({
  entry,
  dataset,
}: {
  entry: ChangeLogEntry;
  dataset: Dataset;
}): string[] {
  switch (entry.kind) {
    case 'cellChanged': {
      const header = dataset.columns[entry.column]?.header ?? '';
      const columnNumber = entry.column + 1;

      return [
        String(toRowNumber(entry.rowId)),
        header,
        String(columnNumber),
        'changed',
        entry.before,
        entry.after,
        entry.origin.kind,
        entry.origin.issueId,
      ];
    }
    case 'rowRemoved':
      return [
        String(toRowNumber(entry.rowId)),
        '',
        '',
        'removed',
        '',
        '',
        entry.origin.kind,
        entry.origin.issueId,
      ];
    case 'encodingConverted':
      return ['', '', '', 'converted', entry.from, entry.to, '', ''];
  }
}
