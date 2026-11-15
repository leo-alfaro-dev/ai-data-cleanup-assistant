import { describe, expect, it } from 'vitest';
import type { Dataset } from '@/engine/dataset/dataset';
import { toColumnKey } from '@/engine/dataset/toColumnKey';
import { toIssueId } from '@/engine/issues/toIssueId';
import { profileDataset } from '@/engine/profile/profileDataset';
import { cleanedValues } from '@/engine/testing/cleanedValues';
import { toDataset } from '@/engine/testing/toDataset';
import { watchRowReads } from '@/engine/testing/watchRowReads';
import { findCasingVariants } from './findCasingVariants';

describe('findCasingVariants', () => {
  it.each(['customer', 'client', 'owner'])(
    'still finds spellings in a column headed %s, since only person-name headers are skipped',
    (header) => {
      const dataset = toDataset(
        `id,${header}`,
        '1,Acme Corp',
        '2,ACME CORP',
        '3,Acme Corp',
        '4,Acme Corp',
        '5,Boston Group',
        '6,Boston Group',
        '7,Boston Group',
        '8,Boston Group'
      );

      expect(findCasing(dataset)).toHaveLength(1);
    }
  );

  it('finds spellings of one value in a categorical column and maps them to the most frequent one', () => {
    const dataset = toDataset(
      'id,city',
      '1,Austin',
      '2,austin',
      '3,Austin',
      '4,AUSTIN',
      '5,Boston',
      '6,Boston',
      '7,Boston',
      '8,Boston'
    );

    const issues = findCasing(dataset);

    expect(issues).toEqual([
      {
        id: toIssueId('casing-variants:1'),
        category: 'inconsistent',
        source: 'check',
        confidence: 'high',
        rows: [1, 3],
        column: 1,
        suggestion: {
          kind: 'mapValues',
          column: toColumnKey(1),
          groups: [{ canonical: 'Austin', variants: ['austin', 'AUSTIN'] }],
        },
        details: {
          kind: 'casingVariants',
          groups: [
            {
              canonical: 'Austin',
              canonicalCount: 2,
              variants: [
                { value: 'austin', count: 1 },
                { value: 'AUSTIN', count: 1 },
              ],
            },
          ],
        },
      },
    ]);
    expect(cleanedValues({ dataset, issues }).map(([, city]) => city)).toEqual([
      'Austin',
      'Austin',
      'Austin',
      'Austin',
      'Boston',
      'Boston',
      'Boston',
      'Boston',
    ]);
  });

  it('picks the most frequent spelling even when another one comes first', () => {
    const dataset = toDataset(
      'plan',
      'pro',
      'Pro',
      'Pro',
      'Pro',
      'Free',
      'Free'
    );

    const [issue] = findCasing(dataset);

    expect(issue?.suggestion).toMatchObject({
      groups: [{ canonical: 'Pro', variants: ['pro'] }],
    });
    expect(issue?.rows).toEqual([0]);
  });

  it('breaks a tie in favour of the spelling seen first in the file', () => {
    const lowerFirst = toDataset(
      'plan',
      'pro',
      'Pro',
      'Pro',
      'pro',
      'Free',
      'Free'
    );
    const upperFirst = toDataset(
      'plan',
      'Pro',
      'pro',
      'pro',
      'Pro',
      'Free',
      'Free'
    );

    const [fromLower] = findCasing(lowerFirst);
    const [fromUpper] = findCasing(upperFirst);

    expect(fromLower?.suggestion).toMatchObject({
      groups: [{ canonical: 'pro', variants: ['Pro'] }],
    });
    expect(fromLower?.rows).toEqual([1, 2]);
    expect(fromUpper?.suggestion).toMatchObject({
      groups: [{ canonical: 'Pro', variants: ['pro'] }],
    });
    expect(fromUpper?.rows).toEqual([1, 2]);
  });

  it('makes one group per value in one issue, with its rows in file order', () => {
    const dataset = toDataset(
      'state',
      'ny',
      'CA',
      'NY',
      'ca',
      'NY',
      'CA',
      'Ny',
      'NY',
      'NY',
      'CA',
      'CA',
      'TX',
      'TX',
      'TX',
      'TX'
    );

    const issues = findCasing(dataset);

    expect(issues).toHaveLength(1);
    expect(issues[0]?.rows).toEqual([0, 3, 6]);
    expect(issues[0]?.suggestion).toEqual({
      kind: 'mapValues',
      column: 0,
      groups: [
        { canonical: 'NY', variants: ['ny', 'Ny'] },
        { canonical: 'CA', variants: ['ca'] },
      ],
    });
  });

  it('counts padding with the spelling it surrounds and still finds the padded variant', () => {
    const dataset = toDataset(
      'city',
      ' austin ',
      'Austin',
      'Austin ',
      'Boston',
      'Boston',
      'Boston',
      'Boston'
    );

    const [issue] = findCasing(dataset);

    expect(issue?.rows).toEqual([0]);
    expect(issue?.details).toEqual({
      kind: 'casingVariants',
      groups: [
        {
          canonical: 'Austin',
          canonicalCount: 2,
          variants: [{ value: 'austin', count: 1 }],
        },
      ],
    });
    expect(cleanedValues({ dataset, issues: [issue ?? never()] })).toEqual([
      ['Austin'],
      ['Austin'],
      ['Austin '],
      ['Boston'],
      ['Boston'],
      ['Boston'],
      ['Boston'],
    ]);
  });

  it('leaves spellings that differ only in whitespace to the whitespace check', () => {
    const dataset = toDataset(
      'city',
      'New York',
      'New  York',
      ' New York',
      'New York ',
      'Boston',
      'Boston',
      'Boston',
      'Boston'
    );

    expect(findCasing(dataset)).toEqual([]);
  });

  it('finds variants that differ in case and Unicode letters', () => {
    const dataset = toDataset(
      'city',
      'Café',
      'CAFÉ',
      'Café',
      'Café',
      'Boston',
      'Boston',
      'Boston',
      'Boston'
    );

    const [issue] = findCasing(dataset);

    expect(issue?.rows).toEqual([1]);
  });

  it('finds variants in a yes/no column', () => {
    const dataset = toDataset(
      'active',
      'Yes',
      'Yes',
      'yes',
      'YES',
      'No',
      'No',
      'No',
      'No'
    );

    const [issue] = findCasing(dataset);

    expect(issue?.rows).toEqual([2, 3]);
  });

  it('produces no casing issue for a column of names', () => {
    const dataset = toDataset(
      'id,first_name,Full Name,state_name',
      '1,Ann,Ann Lee,Texas',
      '2,ann,ann lee,texas',
      '3,Ann,Ann Lee,Texas',
      '4,ann,ann lee,texas'
    );

    const issues = findCasing(dataset);

    expect(issues.map(({ column }) => column)).toEqual([3]);
  });

  it('ignores a column that is not categorical', () => {
    const dataset = toDataset(
      'note',
      'alpha',
      'ALPHA',
      'beta',
      'gamma',
      'delta'
    );

    expect(findCasing(dataset)).toEqual([]);
  });

  it('ignores columns whose dominant type is not text or yes/no', () => {
    const dataset = toDataset(
      'email,visits',
      'a@example.com,1',
      'A@example.com,2',
      'a@example.com,1',
      'A@example.com,2'
    );

    expect(findCasing(dataset)).toEqual([]);
  });

  it('keeps placeholders out of any group', () => {
    const dataset = toDataset(
      'plan',
      ...Array.from({ length: 6 }, () => 'Free'),
      ...Array.from({ length: 6 }, () => 'Pro'),
      'N/A',
      'n/a',
      'None',
      'none',
      'NONE'
    );

    expect(profileDataset(dataset)[0]?.isCategorical).toBe(true);
    expect(findCasing(dataset)).toEqual([]);
  });

  it('finds nothing when every value has one spelling', () => {
    const dataset = toDataset('plan', 'Free', 'Pro', 'Free', 'Pro');

    expect(findCasing(dataset)).toEqual([]);
  });

  it('finds nothing in a file with one row', () => {
    expect(findCasing(toDataset('plan', 'Free'))).toEqual([]);
  });

  it('leaves blank cells out, and a short row counts as blank', () => {
    const dataset = toDataset(
      'id,plan',
      '1,Free',
      '2,',
      '3, ',
      '4',
      '5,free',
      '6,Free',
      '7,Free',
      '8,Free'
    );

    const [issue] = findCasing(dataset);

    expect(issue?.rows).toEqual([4]);
  });

  it('reports one issue per column, each with its own id', () => {
    const dataset = toDataset(
      'plan,state',
      'Free,CA',
      'free,ca',
      'Free,CA',
      'Free,CA'
    );

    const issues = findCasing(dataset);

    expect(
      issues.map(({ id, column, rows }) => ({ id, column, rows }))
    ).toEqual([
      { id: toIssueId('casing-variants:0'), column: 0, rows: [1] },
      { id: toIssueId('casing-variants:1'), column: 1, rows: [1] },
    ]);
  });

  it('reads every row once', () => {
    const rowCount = 50;
    const dataset = toDataset(
      'plan,state',
      ...Array.from(
        { length: rowCount },
        (_, index) => `${index % 2 === 0 ? 'Free' : 'free'},${index % 3}`
      )
    );
    const watched = watchRowReads(dataset);

    findCasingVariants.find({
      dataset: watched.dataset,
      profile: profileDataset(dataset),
    });

    const rowReads = watched.reads.filter((property) => /^\d+$/.test(property));
    expect(rowReads).toHaveLength(rowCount);
  });
});

function findCasing(dataset: Dataset) {
  return findCasingVariants.find({
    dataset,
    profile: profileDataset(dataset),
  });
}

function never(): never {
  throw new Error('Expected an issue');
}
