import type { HostedQuota } from '@/ai/hostedQuota';

// Answers arrive out of order: within one window the highest count is the latest one.
export function latestQuota({
  current,
  incoming,
}: {
  current: HostedQuota | null;
  incoming: HostedQuota;
}): HostedQuota {
  if (current === null || incoming.resetsAt > current.resetsAt) return incoming;
  if (incoming.resetsAt < current.resetsAt) return current;

  return incoming.used > current.used ? incoming : current;
}
