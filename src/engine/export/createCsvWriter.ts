import { BYTE_ORDER_MARK } from '@/engine/dataset/byteOrderMark';
import type { Delimiter, SourceFormat } from '@/engine/dataset/dataset';
import type { CsvWriter } from './csvWriter';

export function createCsvWriter(format: SourceFormat): CsvWriter {
  const { delimiter, lineBreak } = format;
  const needsQuotes = QUOTE_TRIGGERS[delimiter];

  // Spreadsheet apps read UTF-8 without a mark in their legacy encoding,
  // so a converted file gets one.
  const needsByteOrderMark =
    format.hasByteOrderMark || format.encoding !== 'utf-8';
  const prefix = needsByteOrderMark ? BYTE_ORDER_MARK : '';

  const toField = (value: string) =>
    needsQuotes.test(value) ? `"${value.replaceAll('"', '""')}"` : value;

  return {
    // Joining keeps each line a flat string; lines built with += stay ropes until the
    // final join, which doubled peak memory.
    toLine: (values) => {
      const line = values.map(toField).join(delimiter);

      return line === '' ? EMPTY_LINE_FIELD : line;
    },
    toText: (lines) => prefix + lines.join(lineBreak) + lineBreak,
  };
}

// An empty line is skipped by readers, so a lone empty value is written as a quoted field.
const EMPTY_LINE_FIELD = '""';

const QUOTE_TRIGGERS: Record<Delimiter, RegExp> = {
  ',': /[,"\r\n]/,
  ';': /[;"\r\n]/,
  '\t': /[\t"\r\n]/,
  '|': /[|"\r\n]/,
};
