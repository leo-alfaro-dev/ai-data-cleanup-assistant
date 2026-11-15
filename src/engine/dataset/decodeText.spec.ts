import { describe, expect, it } from 'vitest';
import { decodeText } from './decodeText';
import { parseCsv } from './parseCsv';

describe('decodeText', () => {
  it('decodes UTF-8', () => {
    const bytes = new TextEncoder().encode('city\nZürich');

    expect(decodeText(bytes)).toEqual({
      text: 'city\nZürich',
      encoding: 'utf-8',
    });
  });

  it('falls back to Windows-1252 when the bytes are not valid UTF-8', () => {
    expect(decodeText(singleByte('Café'))).toEqual({
      text: 'Café',
      encoding: 'windows-1252',
    });
  });

  it('reads the bytes that differ between Windows-1252 and Latin-1', () => {
    const euroSignAndCurlyQuotes = Uint8Array.from([0x80, 0x93, 0x94]);
    const curlyApostrophe = 0x92;

    expect(decodeText(euroSignAndCurlyQuotes).text).toBe('€\u201C\u201D');
    expect(
      decodeText(Uint8Array.from([...singleByte('O'), curlyApostrophe])).text
    ).toBe('O\u2019');
  });

  it('leaves bytes that Windows-1252 does not define as they are', () => {
    expect(decodeText(Uint8Array.from([0x81, 0x9d])).text).toBe('\u0081\u009D');
  });

  it('keeps a byte order mark in the text', () => {
    const bytes = Uint8Array.from([0xef, 0xbb, 0xbf, 0x61]);

    expect(decodeText(bytes).text).toBe('\uFEFFa');
  });

  it('turns a Windows-1252 file with accents into readable cells', () => {
    const outcome = parseCsv(
      decodeText(
        singleByte('origin;destination\r\nZürich;Bogotá\r\nDüsseldorf;Göteborg')
      )
    );

    expect(outcome).toMatchObject({
      ok: true,
      dataset: {
        format: { encoding: 'windows-1252', delimiter: ';' },
        rows: [
          ['Zürich', 'Bogotá'],
          ['Düsseldorf', 'Göteborg'],
        ],
      },
    });
  });
});

// Below U+0100 a character's code is its Windows-1252 byte, except 0x80–0x9F.
function singleByte(text: string): Uint8Array {
  return Uint8Array.from(text, (character) => character.charCodeAt(0));
}
