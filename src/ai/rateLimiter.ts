// A full run on the sample makes 6 calls and a file at every cap about 14, so this lets one
// visitor start a few runs, with retries, per window.
export const HOSTED_CALLS_PER_WINDOW = 40;
export const HOSTED_WINDOW_MS = 10 * 60 * 1000;

type Window = { startedAt: number; count: number };

export type RateLimiter = {
  /** Counts one call for the address and says whether it is within the limit. */
  take: (address: string) => boolean;
};

export function createRateLimiter({
  limit,
  windowMs,
  now = Date.now,
}: {
  limit: number;
  windowMs: number;
  now?: () => number;
}): RateLimiter {
  const windows = new Map<string, Window>();

  return {
    take(address) {
      const current = now();
      dropExpired({ windows, now: current, windowMs });

      const window = windows.get(address);
      if (!window) {
        windows.set(address, { startedAt: current, count: 1 });
        return true;
      }
      if (window.count >= limit) return false;

      window.count += 1;
      return true;
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

export const hostedRateLimiter = createRateLimiter({
  limit: HOSTED_CALLS_PER_WINDOW,
  windowMs: HOSTED_WINDOW_MS,
});
