import type { HostedQuota } from './hostedQuota';
import {
  HOSTED_REQUESTS_PER_WINDOW,
  HOSTED_WINDOW_MS,
} from './hostedRequestLimit';

type Window = { startedAt: number; count: number };

export type RateLimit = HostedQuota & { isAllowed: boolean };

export type RateLimiter = {
  /** Counts one request for the address unless it is past the limit, and reports the window. */
  take: (address: string) => RateLimit;
};

export function createRateLimiter({
  limit,
  windowMs,
  isEnforced = true,
  now = Date.now,
}: {
  limit: number;
  windowMs: number;
  isEnforced?: boolean;
  now?: () => number;
}): RateLimiter {
  const windows = new Map<string, Window>();

  return {
    take(address) {
      const current = now();
      dropExpired({ windows, now: current, windowMs });

      const window = windows.get(address) ?? { startedAt: current, count: 0 };
      windows.set(address, window);
      const isAllowed = !isEnforced || window.count < limit;
      if (isAllowed) window.count += 1;

      return {
        isAllowed,
        used: window.count,
        limit,
        resetsAt: window.startedAt + windowMs,
      };
    },
  };
}

// Keeps the map bounded by the addresses seen in one window.
function dropExpired({
  windows,
  now,
  windowMs,
}: {
  windows: Map<string, Window>;
  now: number;
  windowMs: number;
}): void {
  for (const [address, { startedAt }] of windows) {
    if (now - startedAt >= windowMs) windows.delete(address);
  }
}

// Under `next dev` the hosted key is the developer's own: requests are counted, never refused.
export const hostedRateLimiter = createRateLimiter({
  limit: HOSTED_REQUESTS_PER_WINDOW,
  windowMs: HOSTED_WINDOW_MS,
  isEnforced: process.env.NODE_ENV !== 'development',
});
