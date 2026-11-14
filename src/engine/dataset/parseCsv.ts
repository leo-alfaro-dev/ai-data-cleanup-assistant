import Papa from 'papaparse';
import type {
  Column,
  ColumnKey,
  Dataset,
  RaggedRow,
  RowId,
  TextEncoding,
} from './dataset';
import { DELIMITERS, LINE_BREAKS } from './dataset';
import type { LoadFailureReason } from './loadFailure';

export function parseCsv({
  text,
  encoding,
}: {
  text: string;
  encoding: TextEncoding;
}):
  | { ok: true; dataset: Dataset }
  | { ok: false; reason: Extract<LoadFailureReason, 'empty' | 'noDataRows'> } {
  const hasByteOrderMark = text.startsWith(BYTE_ORDER_MARK);
  const content = hasByteOrderMark ? text.slice(BYTE_ORDER_MARK.length) : text;

  // Papa's guess counts a zero-length line as a one-field row, so a short file ending in a
  // line break reads as one column. Guessing with those lines skipped avoids it.
  const { delimiter } = Papa.parse<string[]>(content, {
    delimitersToGuess: [...DELIMITERS],
    skipEmptyLines: true,
    preview: DELIMITER_PREVIEW_ROWS,
  }).meta;
  const parsed = Papa.parse<string[]>(content, { delimiter });

  const records = parsed.data;
  const endsWithLineBreak = isZeroLength(records.at(-1));
  if (endsWithLineBreak) records.pop();

  const rows = records.filter((record) => !isZeroLength(record));
  const blankLinesSkipped = records.length - rows.length;

  const header = rows.shift();
  if (!header) return { ok: false, reason: 'empty' };
  if (rows.length === 0) return { ok: false, reason: 'noDataRows' };

  const columnCount = rows.reduce(
    (widest, row) => Math.max(widest, row.length),
    header.length
  );
  const raggedRows: RaggedRow[] = [];

  rows.forEach((row, index) => {
    if (row.length !== header.length) {
      raggedRows.push({ rowId: index as RowId, cellCount: row.length });
    }
    if (row.length < columnCount) {
      rows[index] = padRow({ row, length: columnCount });
    }
  });

  const columns: Column[] = Array.from({ length: columnCount }, (_, index) => ({
    key: index as ColumnKey,
    header: header[index] ?? '',
  }));

  return {
    ok: true,
    dataset: {
      columns,
      rows,
      format: {
        delimiter:
          DELIMITERS.find((option) => option === parsed.meta.delimiter) ?? ',',
        lineBreak:
          LINE_BREAKS.find((option) => option === parsed.meta.linebreak) ??
          '\n',
        hasByteOrderMark,
        encoding,
      },
      structure: {
        headerCellCount: header.length,
        raggedRows,
        blankLinesSkipped,
      },
    },
  };
}

const BYTE_ORDER_MARK = '\uFEFF';

const DELIMITER_PREVIEW_ROWS = 10;

function isZeroLength(record: readonly string[] | undefined): boolean {
  return record?.length === 1 && record[0] === '';
}

function padRow({ row, length }: { row: string[]; length: number }) {
  return row.concat(new Array<string>(length - row.length).fill(''));
}
