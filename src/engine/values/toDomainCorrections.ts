import { isOneEditApart } from './isOneEditApart';

type DomainGroup = { count: number; spelling: string; spellingCount: number };

/**
 * Maps each domain that is one edit from exactly one dominant domain to that domain's spelling.
 * Dominant domains are learned from `domainCounts`; `candidates` are further domains to correct
 * that do not count toward dominance.
 */
export function toDomainCorrections({
  domainCounts,
  candidates,
}: {
  domainCounts: ReadonlyMap<string, number>;
  candidates: Iterable<string>;
}): Map<string, string> {
  const { groups, total } = groupDomains(domainCounts);

  const isDominant = (group: DomainGroup) =>
    group.count >= total * DOMINANT_DOMAIN_SHARE;
  const dominant = [...groups]
    .filter(
      ([key, group]) =>
        isDominant(group) && key.length >= MIN_TYPO_DOMAIN_LENGTH
    )
    .map(([key, group]) => ({ key, spelling: group.spelling }));

  const corrections = new Map<string, string>();
  for (const domain of new Set([...domainCounts.keys(), ...candidates])) {
    const key = domain.toLowerCase();
    const group = groups.get(key);
    if (group && isDominant(group)) continue;

    const neighbors = dominant.filter(
      (candidate) =>
        Math.abs(candidate.key.length - key.length) <= 1 &&
        !isSameCompanyHost({ first: candidate.key, second: key }) &&
        isOneEditApart({ first: candidate.key, second: key })
    );
    const [neighbor] = neighbors;
    if (neighbors.length === 1 && neighbor) {
      corrections.set(domain, neighbor.spelling);
    }
  }

  return corrections;
}

// A domain that carries this share of the addresses is the column's own, not a typo.
const DOMINANT_DOMAIN_SHARE = 0.2;

// In a shorter domain one edit is as likely to be another domain (`aol.com`, `aoi.com`) as a typo.
const MIN_TYPO_DOMAIN_LENGTH = 8;

function groupDomains(domainCounts: ReadonlyMap<string, number>): {
  groups: Map<string, DomainGroup>;
  total: number;
} {
  const groups = new Map<string, DomainGroup>();
  let total = 0;

  for (const [domain, count] of domainCounts) {
    const key = domain.toLowerCase();
    const group = groups.get(key) ?? {
      count: 0,
      spelling: domain,
      spellingCount: 0,
    };
    groups.set(key, group);

    group.count += count;
    total += count;
    if (count > group.spellingCount) {
      group.spelling = domain;
      group.spellingCount = count;
    }
  }

  return { groups, total };
}

// `uk.acme.com` and `us.acme.com` are two hosts of one company, not a typo of each other. A
// two-part suffix such as `co.uk` makes this skip a real typo, which costs a miss, not a wrong fix.
function isSameCompanyHost({
  first,
  second,
}: {
  first: string;
  second: string;
}): boolean {
  const firstLabels = first.split('.');
  const secondLabels = second.split('.');
  const hasSubdomains = firstLabels.length > 2 && secondLabels.length > 2;

  return (
    hasSubdomains &&
    firstLabels.slice(-2).join('.') === secondLabels.slice(-2).join('.')
  );
}
