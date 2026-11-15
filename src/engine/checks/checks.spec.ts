// cspell:ignore exmaple examplecom
import { describe, expect, it } from 'vitest';
import type { Dataset } from '@/engine/dataset/dataset';
import { ISSUE_CATEGORIES } from '@/engine/issues/issue';
import { profileDataset } from '@/engine/profile/profileDataset';
import { acceptSuggestions } from '@/engine/testing/acceptSuggestions';
import { cleanEveryCell } from '@/engine/testing/cleanEveryCell';
import { expectIssueContract } from '@/engine/testing/expectIssueContract';
import { toDataset } from '@/engine/testing/toDataset';
import { CHECKS } from './checks';
import { runChecks } from './runChecks';

describe('CHECKS', () => {
  it('has a unique id for every check', () => {
    const ids = CHECKS.map(({ id }) => id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('lists the checks by category, in the order the brief names them', () => {
    const order = CHECKS.map(({ category }) =>
      ISSUE_CATEGORIES.indexOf(category)
    );

    expect(order).toEqual([...order].sort((first, second) => first - second));
  });

  describe('on a messy file', () => {
    const dataset = messyFile();
    const profile = profileDataset(dataset);

    it('finds something with every check', () => {
      const issues = runChecks({ dataset, profile });

      for (const { id } of CHECKS) {
        expect(
          issues.some((issue) => issue.id.startsWith(id)),
          `${id} finds nothing`
        ).toBe(true);
      }
    });

    it('gives each check the category it declares', () => {
      for (const check of CHECKS) {
        for (const issue of check.find({ dataset, profile })) {
          expect(issue.category, issue.id).toBe(check.category);
          expect(issue.source).toBe('check');
        }
      }
    });

    it('keeps every issue to its contract', () => {
      expectIssueContract({ dataset, issues: runChecks({ dataset, profile }) });
    });

    it('cleans to the same file whatever order the suggestions are accepted in', () => {
      const accepted = acceptSuggestions(runChecks({ dataset, profile }));

      const forward = cleanEveryCell({ dataset, accepted });
      const backward = cleanEveryCell({
        dataset,
        accepted: [...accepted].reverse(),
      });

      expect(backward).toEqual(forward);
    });

    it('leaves the dataset and the profile unchanged', () => {
      const before = structuredClone({ dataset, profile });

      runChecks({ dataset, profile });

      expect({ dataset, profile }).toEqual(before);
    });
  });

  it('finds nothing in a clean file', () => {
    const dataset = toDataset(
      'id,name,email',
      ...Array.from(
        { length: 40 },
        (_, index) => `${index},Person ${index},p${index}@example.com`
      )
    );

    expect(runChecks({ dataset, profile: profileDataset(dataset) })).toEqual(
      []
    );
  });
});

function messyFile(): Dataset {
  const cities = ['Austin', 'Boston', 'Denver'];
  const pad = (value: number) => String(value).padStart(2, '0');
  const clean = Array.from(
    { length: 40 },
    (_, index) =>
      `C-${index},Person ${index},p${index}@example.com,(212) 555-01${pad(index)},${cities[index % 3]},2024-03-${pad((index % 28) + 1)},${20 + index}.50,ok,x`
  );

  return toDataset(
    'id,name,email,phone,city,signup,spend,note,Note',
    ...clean,
    // 40: an exact copy of row 3
    clean[3] ?? '',
    // 41: row 4 again, with other casing and spacing
    'C-4, PERSON 4,P4@EXAMPLE.COM,(212) 555-0104,boston ,2024-03-05,24.50,ok,x',
    // 42: row 5's email under a name that matches
    'C-905,person 5,p5@example.com,,Denver,2024-03-06,25.50,ok,x',
    // 43,44: two other people on one phone
    'C-906,Ana Diaz,ana@acme.example.org,(212) 555-0177,Boston,2024-03-07,26.50,ok,x',
    'C-907,Luis Moreno,luis@acme.example.org,(212) 555-0177,Boston,2024-03-08,27.50,ok,x',
    // 45-47: mixed date formats, an ambiguous date
    'C-908,Bo Li,bo@example.com,(212) 555-0178,Austin,03/25/2024,28.50,ok,x',
    'C-909,Cy Ng,cy@example.com,(212) 555-0179,Austin,"Mar 7, 2024",29.50,ok,x',
    'C-910,Di Ok,di@example.com,(212) 555-0180,Austin,03/04/2024,30.50,ok,x',
    // 48-50: email problems
    'C-911,Ed Po,jo@exmaple.com,(212) 555-0181,Denver,2024-03-09,31.50,ok,x',
    'C-912,Fy Qu,fy@examplecom,(212) 555-0182,Denver,2024-03-10,32.50,ok,x',
    'C-913,Gu Ra,no-at.example.com,(212) 555-0183,Denver,2024-03-11,33.50,ok,x',
    // 51,52: an outlier and a negative spend
    'C-914,Hi Su,hi@example.com,(212) 555-0184,Boston,2024-03-12,99999.00,ok,x',
    'C-915,Io Ta,io@example.com,(212) 555-0185,Boston,2024-03-13,-45.00,ok,x',
    // 53-55: placeholders, a blank, a word where a number goes
    'C-916,Jo Ue,jo2@example.com,-,Boston,2024-03-14,N/A,ok,x',
    'C-917,Ka Vi,ka@example.com,(212) 555-0187,,2024-03-15,35.50,ok,x',
    'C-918,Le Wo,le@example.com,(212) 555-0188,Boston,2024-03-16,twelve,ok,x',
    // 56: a formula
    'C-919,=SUM(A1),mo@example.com,(212) 555-0189,Boston,2024-03-17,37.50,ok,x',
    // 57: padded values
    'C-920,  Ned Xu ,ned@example.com,(212) 555-0190, Denver ,2024-03-18,38.50,ok,x',
    // 58: a short row, 59: a long row, 60: an unpadded date, 61: a blank row
    'C-921,Ola Yi',
    'C-922,Pat Zu,pat@example.com,(212) 555-0192,Denver,2024-03-19,40.50,ok,x,extra',
    'C-923,Qi Ab,qi@example.com,(212) 555-0193,Denver,2024-3-21,41.50,ok,x',
    ',,,,,,,,'
  );
}
