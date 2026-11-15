import { formatCount } from './formatCount';

export function countOf({
  count,
  noun,
  plural = `${noun}s`,
}: {
  count: number;
  noun: string;
  plural?: string;
}): string {
  return `${formatCount(count)} ${count === 1 ? noun : plural}`;
}
