export const PLANS = [
  { name: 'Free', share: 0.3, baseCents: 0, maxUsageCents: 0 },
  { name: 'Starter', share: 0.3, baseCents: 1900, maxUsageCents: 999 },
  { name: 'Pro', share: 0.28, baseCents: 4900, maxUsageCents: 2499 },
  { name: 'Business', share: 0.12, baseCents: 9900, maxUsageCents: 2499 },
] as const;
