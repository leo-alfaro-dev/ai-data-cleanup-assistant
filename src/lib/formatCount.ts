export function formatCount(count: number): string {
  return countFormat.format(count);
}

const countFormat = new Intl.NumberFormat('en-US');
