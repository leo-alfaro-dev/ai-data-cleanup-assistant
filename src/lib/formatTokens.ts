export function formatTokens(tokens: number): string {
  if (tokens < 1000) return String(tokens);

  const thousands = tokens / 1000;
  const isHundredsOfThousands = thousands >= 100;
  const rounded = isHundredsOfThousands
    ? Math.round(thousands)
    : thousands.toFixed(1);
  if (Number(rounded) >= 1000) return `${(tokens / 1_000_000).toFixed(1)}M`;

  return `${rounded}k`;
}
