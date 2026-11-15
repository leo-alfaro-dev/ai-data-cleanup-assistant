import type { Random } from '../generate/random';
import { introduceTypo } from './introduceTypo';

export function introduceDomainTypo({
  email,
  random,
}: {
  email: string;
  random: Random;
}): string {
  const domainStart = email.lastIndexOf('@') + 1;
  const labels = email.slice(domainStart).split('.');
  const typoLabel = random.integer({ min: 0, max: labels.length - 1 });

  const domain = labels
    .map((label, index) =>
      index === typoLabel ? introduceTypo({ value: label, random }) : label
    )
    .join('.');

  return email.slice(0, domainStart) + domain;
}
