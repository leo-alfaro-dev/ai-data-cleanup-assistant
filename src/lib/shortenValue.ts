export function shortenValue({
  value,
  maxLength,
}: {
  value: string;
  maxLength: number;
}): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength)}…`;
}
