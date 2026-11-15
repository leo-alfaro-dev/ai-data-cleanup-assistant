import { describe, expect, it } from 'vitest';
import { BYTE_ORDER_MARK } from '@/engine/dataset/byteOrderMark';
import type { Delimiter, SourceFormat } from '@/engine/dataset/dataset';
import { DELIMITERS, LINE_BREAKS } from '@/engine/dataset/dataset';
import { createCsvWriter } from './createCsvWriter';

const PLAIN_FORMAT: SourceFormat = {
  delimiter: ',',
  lineBreak: '\n',
  hasByteOrderMark: false,
  encoding: 'utf-8',
};

describe('createCsvWriter, toLine', () => {
  it.each(DELIMITERS)('joins plain values with %j', (delimiter) => {
    const writer = writerFor(delimiter);

    expect(writer.toLine(['Ada', 'Austin', '34'])).toBe(
      ['Ada', 'Austin', '34'].join(delimiter)
    );
  });

  it.each(DELIMITERS)('quotes a value that contains %j', (delimiter) => {
    const writer = writerFor(delimiter);

    expect(writer.toLine([`Doe${delimiter} Jane`, 'Austin'])).toBe(
      `"Doe${delimiter} Jane"${delimiter}Austin`
    );
  });

  it.each(DELIMITERS)(
    'leaves the other delimiters unquoted in a %j file',
    (delimiter) => {
      const writer = writerFor(delimiter);
      const others = DELIMITERS.filter((option) => option !== delimiter);

      expect(writer.toLine(others.map((other) => `a${other}b`))).toBe(
        others.map((other) => `a${other}b`).join(delimiter)
      );
    }
  );

  it('quotes a value with a double quote and doubles the quotes inside it', () => {
    const writer = writerFor(',');

    expect(writer.toLine(['She said "hi"', '"'])).toBe(
      '"She said ""hi""",""""'
    );
  });

  it.each(['\n', '\r', '\r\n'])(
    'quotes a value with a line break %j',
    (lineBreak) => {
      const writer = writerFor(',');

      expect(writer.toLine([`one${lineBreak}two`])).toBe(
        `"one${lineBreak}two"`
      );
    }
  );

  it('writes spaces, non-breaking spaces and tabs as they are', () => {
    const writer = writerFor(',');

    expect(writer.toLine(['  padded ', '\u00A0nbsp\u00A0', 'tab\there'])).toBe(
      '  padded ,\u00A0nbsp\u00A0,tab\there'
    );
  });

  it('writes formula-like values verbatim', () => {
    const writer = writerFor(',');

    expect(writer.toLine(['=SUM(A1)', '+1', '@x', '-2+3', '\t=1'])).toBe(
      '=SUM(A1),+1,@x,-2+3,\t=1'
    );
  });

  it('quotes the same value every time it is asked', () => {
    const writer = writerFor(',');

    const lines = [1, 2, 3].map(() => writer.toLine(['a,b']));

    expect(lines).toEqual(['"a,b"', '"a,b"', '"a,b"']);
  });

  it('writes a line of only empty values as delimiters, and a lone empty value as a quoted field', () => {
    const writer = writerFor(';');

    expect(writer.toLine(['', ''])).toBe(';');
    expect(writer.toLine([''])).toBe('""');
    expect(writer.toLine([' '])).toBe(' ');
  });
});

describe('createCsvWriter, toText', () => {
  it.each(LINE_BREAKS)('joins lines with %j and ends with one', (lineBreak) => {
    const writer = createCsvWriter({ ...PLAIN_FORMAT, lineBreak });

    expect(writer.toText(['a', 'b'])).toBe(`a${lineBreak}b${lineBreak}`);
  });

  it.each([
    {
      name: 'a UTF-8 file without a mark',
      hasByteOrderMark: false,
      encoding: 'utf-8' as const,
      mark: '',
    },
    {
      name: 'a UTF-8 file with a mark',
      hasByteOrderMark: true,
      encoding: 'utf-8' as const,
      mark: BYTE_ORDER_MARK,
    },
    {
      name: 'a Windows-1252 file without a mark',
      hasByteOrderMark: false,
      encoding: 'windows-1252' as const,
      mark: BYTE_ORDER_MARK,
    },
    {
      name: 'a Windows-1252 file with a mark',
      hasByteOrderMark: true,
      encoding: 'windows-1252' as const,
      mark: BYTE_ORDER_MARK,
    },
  ])(
    'starts $name with the right prefix',
    ({ hasByteOrderMark, encoding, mark }) => {
      const writer = createCsvWriter({
        ...PLAIN_FORMAT,
        hasByteOrderMark,
        encoding,
      });

      expect(writer.toText(['a'])).toBe(`${mark}a\n`);
    }
  );
});

function writerFor(delimiter: Delimiter) {
  return createCsvWriter({ ...PLAIN_FORMAT, delimiter });
}
