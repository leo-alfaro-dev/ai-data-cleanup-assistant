// 555-0100 to 555-0199 is the range reserved for fiction, so no number can reach a real line.
const AREA_CODES = [
  '202',
  '206',
  '212',
  '303',
  '305',
  '312',
  '404',
  '415',
  '503',
  '512',
  '602',
  '612',
  '617',
  '619',
  '713',
] as const;

const FICTIONAL_LINE_COUNT = 100;

export const PHONE_NUMBERS: readonly string[] = AREA_CODES.flatMap((areaCode) =>
  Array.from({ length: FICTIONAL_LINE_COUNT }, (_, line) => {
    const lineDigits = String(line).padStart(2, '0');

    return `(${areaCode}) 555-01${lineDigits}`;
  })
);
