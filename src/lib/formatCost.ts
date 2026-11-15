// Dollars as OpenRouter reports them. Under a tenth of a cent it says so rather than showing zero.
export function formatCost(dollars: number): string {
  if (dollars === 0) return '$0';
  if (dollars < MIN_SHOWN_COST) return `<$${MIN_SHOWN_COST}`;
  if (dollars < 1) return `$${dollars.toFixed(3)}`;

  return `$${dollars.toFixed(2)}`;
}

const MIN_SHOWN_COST = 0.001;
