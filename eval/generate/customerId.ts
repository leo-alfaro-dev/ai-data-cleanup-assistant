export const FIRST_CUSTOMER_NUMBER = 10001;

export function toCustomerId(number: number): string {
  return `C-${number}`;
}
