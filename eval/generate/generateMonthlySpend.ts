import type { Random } from './random';
import type { PLANS } from './plans';

export function generateMonthlySpend({
  plan,
  random,
}: {
  plan: (typeof PLANS)[number];
  random: Random;
}): string {
  const usageCents = random.integer({ min: 0, max: plan.maxUsageCents });

  return ((plan.baseCents + usageCents) / CENTS_PER_UNIT).toFixed(2);
}

const CENTS_PER_UNIT = 100;
