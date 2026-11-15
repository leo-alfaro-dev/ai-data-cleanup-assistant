import { tryCatch } from '@/lib/tryCatch';
import type { TextEncoding } from './dataset';

export function decodeText(bytes: Uint8Array): {
  text: string;
  encoding: TextEncoding;
} {
  const { result: text, error } = tryCatch(() => strictUtf8.decode(bytes));

  if (error === null) return { text, encoding: 'utf-8' };

  return { text: decodeWindows1252(bytes), encoding: 'windows-1252' };
}

// ignoreBOM keeps the mark in the text, so parseCsv can record it for export.
const strictUtf8 = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });

const windows1252 = new TextDecoder('windows-1252');

const WINDOWS_1252_0X80_TO_0X9F = String.fromCharCode(
  ...[0x20ac, 0x81, 0x201a, 0x192, 0x201e, 0x2026, 0x2020, 0x2021],
  ...[0x2c6, 0x2030, 0x160, 0x2039, 0x152, 0x8d, 0x17d, 0x8f],
  ...[0x90, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014],
  ...[0x2dc, 0x2122, 0x161, 0x203a, 0x153, 0x9d, 0x17e, 0x178]
);

// Node decodes 'windows-1252' as Latin-1, leaving 0x80–0x9F as control characters; browsers
// don't. Mapping them here makes the worker, the specs and `yarn eval` read the same text.
function decodeWindows1252(bytes: Uint8Array): string {
  return windows1252
    .decode(bytes)
    .replace(
      /[\u0080-\u009F]/g,
      (character) =>
        WINDOWS_1252_0X80_TO_0X9F[character.charCodeAt(0) - 0x80] ?? character
    );
}
