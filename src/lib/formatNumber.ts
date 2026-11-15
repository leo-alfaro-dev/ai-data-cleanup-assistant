export function formatNumber(value: number): string {
  return numberFormat.format(value);
}

const numberFormat = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 2,
});
