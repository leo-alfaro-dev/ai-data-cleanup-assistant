import { z } from 'zod';

// The requests a visitor has made on the hosted key in the current window.
export const hostedQuota = z.object({
  used: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  resetsAt: z.number(),
});

export type HostedQuota = z.infer<typeof hostedQuota>;
