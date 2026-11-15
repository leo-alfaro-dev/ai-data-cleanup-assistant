// cspell:ignore examplecom exmaple exampel exmple
import { describe, expect, it } from 'vitest';
import type { Dataset } from '@/engine/dataset/dataset';
import { toIssueId } from '@/engine/issues/toIssueId';
import { profileDataset } from '@/engine/profile/profileDataset';
import { accept } from '@/engine/testing/accept';
import { cleanEveryCell } from '@/engine/testing/cleanEveryCell';
import { toDataset } from '@/engine/testing/toDataset';
import { watchRowReads } from '@/engine/testing/watchRowReads';
import { findInvalidEmails } from './findInvalidEmails';

describe('findInvalidEmails, values that fail the pattern', () => {
  it('flags values with no at sign, no dot in the domain, a space or two at signs', () => {
    const addresses = validEmails(24);
    addresses[1] = 'ada.example.com';
    addresses[3] = 'bo@example';
    addresses[5] = 'cy @example.com';
    addresses[7] = 'di@@example.com';
    const dataset = toEmailDataset(addresses);

    expect(findEmails(dataset)).toEqual([
      {
        id: toIssueId('invalid-emails:1'),
        category: 'suspicious',
        source: 'check',
        confidence: 'high',
        rows: [1, 3, 5, 7],
        column: 1,
        suggestion: null,
        details: { kind: 'invalidEmails' },
      },
    ]);
  });

  it('flags a phone number or a name in an email column', () => {
    const dataset = toEmailDataset([
      ...validEmails(8),
      '(555) 010-0123',
      'Ada Lovelace',
    ]);

    expect(findEmails(dataset)[0]?.rows).toEqual([8, 9]);
  });

  it('leaves blank cells, placeholders and padded addresses', () => {
    const dataset = toEmailDataset([
      ...validEmails(30),
      '',
      '   ',
      'N/A',
      'unknown',
      '-',
      'null',
      '  ada@example.com\t',
      ' bo@example.com ',
    ]);

    expect(findEmails(dataset)).toEqual([]);
  });

  it('leaves columns that are not email columns', () => {
    const dataset = toDataset(
      'name,note',
      'Ada,ada.example.com',
      'Bo,hello',
      'Cy,cy@example.com',
      'Di,di@example'
    );

    expect(findEmails(dataset)).toEqual([]);
  });

  it('leaves a column where emails are under four in five', () => {
    const dataset = toEmailDataset([...validEmails(3), 'no one', 'nobody']);

    expect(findEmails(dataset)).toEqual([]);
  });

  it('finds nothing in a clean file or a file with one row', () => {
    expect(findEmails(toEmailDataset(validEmails(10)))).toEqual([]);
    expect(findEmails(toEmailDataset(['ada@example.com']))).toEqual([]);
  });

  it('reports each email column on its own', () => {
    const dataset = toDataset(
      'work,home',
      ...Array.from(
        { length: 8 },
        (_, index) => `w${index}@example.com,h${index}@example.org`
      ),
      'bad,h9@example.org',
      'w9@example.com,bad'
    );

    const issues = findEmails(dataset);

    expect(
      issues.map(({ id, column, rows }) => ({ id, column, rows }))
    ).toEqual([
      { id: toIssueId('invalid-emails:0'), column: 0, rows: [8] },
      { id: toIssueId('invalid-emails:1'), column: 1, rows: [9] },
    ]);
  });
});

describe('findInvalidEmails, domain typos', () => {
  it('suggests the dominant domain for jo@exmaple.com, and the cleaned cell shows it', () => {
    const dataset = toEmailDataset([...validEmails(9), 'jo@exmaple.com']);

    const issues = findEmails(dataset);

    expect(issues).toEqual([
      {
        id: toIssueId('invalid-emails:1:domain-typos'),
        category: 'suspicious',
        source: 'check',
        confidence: 'high',
        rows: [9],
        column: 1,
        suggestion: {
          kind: 'setCells',
          cells: [{ rowId: 9, column: 1, value: 'jo@example.com' }],
        },
        details: {
          kind: 'emailDomainTypos',
          corrections: [
            {
              domain: 'exmaple.com',
              correctedDomain: 'example.com',
              count: 1,
            },
          ],
        },
      },
    ]);
    const [issue] = issues;
    if (!issue?.suggestion) throw new Error('Expected a suggestion');
    const cleaned = cleanEveryCell({
      dataset,
      accepted: [accept({ issue: issue.id, change: issue.suggestion })],
    });
    expect(cleaned.map((row) => row[1]?.value)).toEqual([
      ...validEmails(9),
      'jo@example.com',
    ]);
    expect(cleaned.filter((row) => row[1]?.isChanged)).toHaveLength(1);
  });

  it('makes no suggestion when domains are varied', () => {
    const dataset = toEmailDataset([
      'a@alpha.example.com',
      'b@bravo.example.org',
      'c@charlie.example.net',
      'd@delta.example.io',
      'e@echo.example.dev',
      'jo@exmaple.com',
    ]);

    expect(findEmails(dataset)).toEqual([]);
  });

  it('makes no suggestion when the typo is one edit from two dominant domains', () => {
    const dataset = toEmailDataset([
      ...Array.from({ length: 5 }, (_, index) => `a${index}@example.com`),
      ...Array.from({ length: 5 }, (_, index) => `b${index}@example.co`),
      'c@example.cm',
    ]);

    expect(findEmails(dataset)).toEqual([]);
  });

  it('does not turn one host of a company into another', () => {
    const dataset = toEmailDataset([
      ...Array.from({ length: 9 }, (_, index) => `u${index}@us.acme.com`),
      'jo@uk.acme.com',
    ]);

    expect(findEmails(dataset)).toEqual([]);
  });

  it('suggests the dominant domain for a value that fails the pattern only through its domain', () => {
    const dataset = toEmailDataset([...validEmails(9), 'jo@examplecom']);

    const issues = findEmails(dataset);

    expect(issues.map(({ id, rows }) => ({ id, rows }))).toEqual([
      { id: toIssueId('invalid-emails:1:domain-typos'), rows: [9] },
    ]);
    expect(issues[0]?.suggestion).toEqual({
      kind: 'setCells',
      cells: [{ rowId: 9, column: 1, value: 'jo@example.com' }],
    });
  });

  it('keeps a repaired value out of the invalid issue when other values stay invalid', () => {
    const dataset = toEmailDataset([
      ...validEmails(9),
      'jo@examplecom',
      'no-at.example.com',
    ]);

    const issues = findEmails(dataset);

    expect(issues.map(({ id, rows }) => ({ id, rows }))).toEqual([
      { id: toIssueId('invalid-emails:1'), rows: [10] },
      { id: toIssueId('invalid-emails:1:domain-typos'), rows: [9] },
    ]);
  });

  it('keeps a value with spaces in the local part as invalid even when its domain is near', () => {
    const dataset = toEmailDataset([...validEmails(9), 'jo smith@exmaple.com']);

    const issues = findEmails(dataset);

    expect(issues.map(({ id, rows }) => ({ id, rows }))).toEqual([
      { id: toIssueId('invalid-emails:1'), rows: [9] },
    ]);
  });

  it('compares domains without case and keeps the local part as written', () => {
    const dataset = toEmailDataset([
      ...validEmails(9),
      'Jo.Smith+tag@EXMAPLE.COM',
    ]);

    const [issue] = findEmails(dataset);

    expect(issue?.suggestion).toEqual({
      kind: 'setCells',
      cells: [{ rowId: 9, column: 1, value: 'Jo.Smith+tag@example.com' }],
    });
  });

  it('writes the address without padding', () => {
    const dataset = toEmailDataset([...validEmails(9), '  jo@exmaple.com\t']);

    const [issue] = findEmails(dataset);

    expect(issue?.suggestion).toEqual({
      kind: 'setCells',
      cells: [{ rowId: 9, column: 1, value: 'jo@example.com' }],
    });
  });

  it('corrects several typo domains, rows in order, each toward its own domain', () => {
    const dataset = toEmailDataset([
      'a@exmaple.com',
      ...Array.from({ length: 6 }, (_, index) => `u${index}@example.com`),
      'b@exampel.com',
      ...Array.from({ length: 6 }, (_, index) => `v${index}@example.org`),
      'c@exmaple.com',
      'd@exmple.org',
    ]);

    const [issue] = findEmails(dataset);

    expect(issue?.rows).toEqual([0, 7, 14, 15]);
    expect(issue?.suggestion).toEqual({
      kind: 'setCells',
      cells: [
        { rowId: 0, column: 1, value: 'a@example.com' },
        { rowId: 7, column: 1, value: 'b@example.com' },
        { rowId: 14, column: 1, value: 'c@example.com' },
        { rowId: 15, column: 1, value: 'd@example.org' },
      ],
    });
    expect(issue?.details).toEqual({
      kind: 'emailDomainTypos',
      corrections: [
        { domain: 'exmaple.com', correctedDomain: 'example.com', count: 2 },
        { domain: 'exampel.com', correctedDomain: 'example.com', count: 1 },
        { domain: 'exmple.org', correctedDomain: 'example.org', count: 1 },
      ],
    });
  });

  it('leaves a domain two edits from the dominant one', () => {
    const dataset = toEmailDataset([...validEmails(9), 'jo@exmaple.co']);

    expect(findEmails(dataset)).toEqual([]);
  });

  it('leaves a second domain that carries a fifth of the column', () => {
    const dataset = toEmailDataset([
      ...Array.from({ length: 8 }, (_, index) => `u${index}@example.com`),
      'a@example.co',
      'b@example.co',
    ]);

    expect(findEmails(dataset)).toEqual([]);
  });

  it('leaves domains too short for one edit to mean a typo', () => {
    const dataset = toEmailDataset([
      ...Array.from({ length: 9 }, (_, index) => `u${index}@aol.com`),
      'jo@aoi.com',
    ]);

    expect(findEmails(dataset)).toEqual([]);
  });

  it('reports invalid values and domain typos as two issues without overlap', () => {
    const dataset = toEmailDataset([
      ...validEmails(9),
      'jo@exmaple.com',
      'jo.example.com',
    ]);

    const issues = findEmails(dataset);

    expect(issues.map(({ id, rows }) => ({ id, rows }))).toEqual([
      { id: toIssueId('invalid-emails:1'), rows: [10] },
      { id: toIssueId('invalid-emails:1:domain-typos'), rows: [9] },
    ]);
  });

  it('reads each row once for a single email column', () => {
    const dataset = toEmailDataset([...validEmails(30), 'bad']);
    const watched = watchRowReads(dataset);

    findInvalidEmails.find({
      dataset: watched.dataset,
      profile: profileDataset(dataset),
    });

    const rowReads = watched.reads.filter((property) => /^\d+$/.test(property));
    expect(rowReads).toHaveLength(dataset.rows.length);
  });
});

function validEmails(count: number): string[] {
  return Array.from(
    { length: count },
    (_, index) => `user${index}@example.com`
  );
}

function toEmailDataset(addresses: readonly string[]): Dataset {
  return toDataset(
    'name,email',
    ...addresses.map((address, index) => `name ${index},${address}`)
  );
}

function findEmails(dataset: Dataset) {
  return findInvalidEmails.find({
    dataset,
    profile: profileDataset(dataset),
  });
}
