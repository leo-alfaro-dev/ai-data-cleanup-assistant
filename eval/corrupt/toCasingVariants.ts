export function toCasingVariants(value: string): string[] {
  return [value.toLowerCase(), value.toUpperCase()].filter(
    (variant) => variant !== value
  );
}
