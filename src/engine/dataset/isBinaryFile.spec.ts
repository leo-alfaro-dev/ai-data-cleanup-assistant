import { describe, expect, it } from 'vitest';
import { isBinaryFile } from './isBinaryFile';

describe('isBinaryFile', () => {
  it('flags an Excel workbook by its zip signature', () => {
    const workbook = Uint8Array.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x06]);

    expect(isBinaryFile(workbook)).toBe(true);
  });

  it('flags bytes that contain a null byte', () => {
    const utf16Text = Uint8Array.from([0xff, 0xfe, 0x6e, 0x00, 0x61, 0x00]);

    expect(isBinaryFile(utf16Text)).toBe(true);
  });

  it.each([
    { name: 'UTF-8 text', bytes: new TextEncoder().encode('name\nZürich') },
    { name: 'Windows-1252 text', bytes: Uint8Array.from([0x43, 0x61, 0xe9]) },
    { name: 'an empty file', bytes: new Uint8Array() },
  ])('accepts $name', ({ bytes }) => {
    expect(isBinaryFile(bytes)).toBe(false);
  });
});
