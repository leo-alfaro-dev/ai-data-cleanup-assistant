export function toPhoneLayouts(phone: string): string[] {
  const digits = phone.replace(NON_DIGITS, '');
  const areaCode = digits.slice(0, 3);
  const exchange = digits.slice(3, 6);
  const line = digits.slice(6);

  return [
    `${areaCode}-${exchange}-${line}`,
    `${areaCode}.${exchange}.${line}`,
    `${areaCode} ${exchange} ${line}`,
  ];
}

const NON_DIGITS = /\D/g;
