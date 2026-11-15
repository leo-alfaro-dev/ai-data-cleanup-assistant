export function isEmail(value: string): boolean {
  return EMAIL.test(value.trim());
}

const EMAIL = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;
