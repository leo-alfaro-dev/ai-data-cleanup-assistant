// cspell:ignore examplecom exmaple examplee exampl exampke exampel northwind northwnd contoso
import { describe, expect, it } from 'vitest';
import { toDomainCorrections } from './toDomainCorrections';

describe('toDomainCorrections', () => {
  it('maps a rare domain one edit from the dominant domain to it', () => {
    const corrections = correct(counts({ 'example.com': 9, 'exmaple.com': 1 }));

    expect([...corrections]).toEqual([['exmaple.com', 'example.com']]);
  });

  it.each([
    { name: 'an insertion', typo: 'examplee.com' },
    { name: 'a deletion', typo: 'exampl.com' },
    { name: 'a substitution', typo: 'exampke.com' },
    { name: 'a swap', typo: 'exmaple.com' },
    { name: 'a typo in the extension', typo: 'example.cmo' },
  ])('corrects $name', ({ typo }) => {
    const corrections = correct(counts({ 'example.com': 9, [typo]: 1 }));

    expect(corrections.get(typo)).toBe('example.com');
  });

  it('leaves a domain two edits from the dominant domain', () => {
    const corrections = correct(counts({ 'example.com': 9, 'exmaple.co': 1 }));

    expect(corrections.size).toBe(0);
  });

  it('corrects nothing when domains are varied', () => {
    const domains = Object.fromEntries(
      Array.from({ length: 10 }, (_, index) => [`company${index}.com`, 1])
    );

    expect(correct(counts(domains)).size).toBe(0);
  });

  it('learns the dominant domains from the column, not from a list of providers', () => {
    const corrections = correct(
      counts({ 'northwind.io': 6, 'contoso.com': 3, 'northwnd.io': 1 })
    );

    expect([...corrections]).toEqual([['northwnd.io', 'northwind.io']]);
  });

  it('corrects toward the one dominant domain when several are dominant', () => {
    const corrections = correct(
      counts({
        'example.com': 4,
        'example.org': 4,
        'example.net': 4,
        'exmaple.org': 1,
      })
    );

    expect([...corrections]).toEqual([['exmaple.org', 'example.org']]);
  });

  it('corrects nothing when a domain is one edit from two dominant domains', () => {
    const corrections = correct(
      counts({ 'example.com': 5, 'example.co': 5, 'example.cm': 1 })
    );

    expect(corrections.size).toBe(0);
  });

  it('leaves one host of a company that differs from another host of it', () => {
    const corrections = correct(counts({ 'us.acme.com': 9, 'uk.acme.com': 1 }));

    expect(corrections.size).toBe(0);
  });

  it('still corrects a typo inside the company domain of a subdomain', () => {
    const corrections = correct(
      counts({ 'mail.example.com': 9, 'mail.exmaple.com': 1 })
    );

    expect(corrections.get('mail.exmaple.com')).toBe('mail.example.com');
  });

  it('corrects a candidate that is not among the counted domains, without counting it', () => {
    const corrections = toDomainCorrections({
      domainCounts: counts({ 'example.com': 9 }),
      candidates: ['examplecom', 'unrelated.org'],
    });

    expect([...corrections]).toEqual([['examplecom', 'example.com']]);
  });

  it('keeps a domain that carries a fifth of the addresses', () => {
    const corrections = correct(counts({ 'example.com': 8, 'example.co': 2 }));

    expect(corrections.size).toBe(0);
  });

  it('corrects a domain just under a fifth', () => {
    const corrections = correct(
      counts({ 'example.com': 81, 'example.co': 19 })
    );

    expect(corrections.get('example.co')).toBe('example.com');
  });

  it('does not correct toward a domain too short for one edit to mean a typo', () => {
    const corrections = correct(counts({ 'aol.com': 9, 'aoi.com': 1 }));

    expect(corrections.size).toBe(0);
  });

  it('compares domains without case and corrects toward the most common spelling', () => {
    const corrections = correct(
      counts({ 'Example.com': 2, 'example.com': 6, 'EXMAPLE.COM': 1 })
    );

    expect([...corrections]).toEqual([['EXMAPLE.COM', 'example.com']]);
  });

  it('does not correct a spelling of the dominant domain itself', () => {
    const corrections = correct(counts({ 'example.com': 9, 'EXAMPLE.COM': 1 }));

    expect(corrections.size).toBe(0);
  });

  it('only returns domains the input already contained', () => {
    const input = counts({
      'example.com': 9,
      'exmaple.com': 1,
      'exampel.com': 1,
    });

    const corrections = correct(input);

    for (const [domain, corrected] of corrections) {
      expect(input.has(domain)).toBe(true);
      expect(input.has(corrected)).toBe(true);
    }
  });

  it('returns nothing for no domains', () => {
    expect(correct(new Map()).size).toBe(0);
  });
});

function correct(domainCounts: ReadonlyMap<string, number>) {
  return toDomainCorrections({ domainCounts, candidates: [] });
}

function counts(domains: Record<string, number>): Map<string, number> {
  return new Map(Object.entries(domains));
}
