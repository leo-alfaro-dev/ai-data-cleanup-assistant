import { beforeEach, describe, expect, it, vi } from 'vitest';
import { findExactDuplicates } from '@/engine/checks/findExactDuplicates';
import { findSharedIdentifiers } from '@/engine/checks/findSharedIdentifiers';
import type { Dataset } from '@/engine/dataset/dataset';
import { toColumnKey } from '@/engine/dataset/toColumnKey';
import { profileDataset } from '@/engine/profile/profileDataset';
import { toDataset } from '@/engine/testing/toDataset';
import {
  findNearDuplicateCandidates,
  MAX_CANDIDATE_PAIRS,
  MIN_NAME_SIMILARITY,
  NEIGHBOR_WINDOW,
} from './findNearDuplicateCandidates';
import type * as ListNeighborPairs from './listNeighborPairs';

const neighborPairs = vi.hoisted(() => ({ count: 0 }));

vi.mock('./listNeighborPairs', async (importOriginal) => {
  const original = await importOriginal<typeof ListNeighborPairs>();

  return {
    listNeighborPairs: function* (
      input: Parameters<typeof original.listNeighborPairs>[0]
    ) {
      for (const pair of original.listNeighborPairs(input)) {
        neighborPairs.count++;
        yield pair;
      }
    },
  };
});

const EMAIL = toColumnKey(2);
const CITY = toColumnKey(3);

const HEADER = 'first_name,last_name,email,city';

const FIRST_NAMES = ['Ada', 'Bo', 'Cy', 'Di', 'Ed', 'Flo', 'Gus', 'Hal'];
const LAST_NAMES = [
  'Alder',
  'Birch',
  'Cedar',
  'Dogwood',
  'Elm',
  'Fir',
  'Gum',
  'Hazel',
];

// Sorted between "John Smith" and "Jon Smith".
const FILLER_NAMES = ['Johnny', 'Johnson', 'Joiner', 'Jolly', 'Jolson', 'Jolt'];

// Eight unrelated people, rows 0 to 7, each with a city and an email of their own.
// Anything added starts at row 8.
function people(...extraLines: string[]): Dataset {
  const lines = FIRST_NAMES.map(
    (first, index) =>
      `${first},${LAST_NAMES[index]},${first.toLowerCase()}@example.com,City ${index}`
  );

  return toDataset(HEADER, ...lines, ...extraLines);
}

beforeEach(() => {
  neighborPairs.count = 0;
});

describe('findNearDuplicateCandidates', () => {
  it('finds Jon Smith and John Smith in the same city as a candidate, and no issue', () => {
    const dataset = people(
      'Jon,Smith,jon@example.com,Leeds',
      'John,Smith,john.s@example.org,Leeds'
    );

    expect(find(dataset)).toEqual([
      {
        rows: [8, 9],
        similarity: expect.closeTo((14 / 15 + 1) / 2, 10),
        evidence: {
          nameSimilarity: expect.closeTo((14 / 15 + 1) / 2, 10),
          agreeingColumns: [CITY],
          sharedIdentifierColumns: [],
        },
      },
    ]);
    expect(
      findSharedIdentifiers.find({ dataset, profile: profileDataset(dataset) })
    ).toEqual([]);
  });

  it('finds nothing in rows that are unrelated', () => {
    expect(find(people())).toEqual([]);
  });

  it('needs the names to be near, not just the other columns to agree', () => {
    const dataset = people(
      'Zed,Quill,zed@example.com,Leeds',
      'Moe,Rowan,moe@example.com,Leeds'
    );

    expect(find(dataset)).toEqual([]);
  });

  it('needs another column to agree, not just the names', () => {
    const dataset = people(
      'Jon,Smith,jon@example.com,Leeds',
      'John,Smith,john@example.org,Hull'
    );

    expect(find(dataset)).toEqual([]);
  });

  it('keeps two rows with the same name and nothing else in common apart', () => {
    const dataset = people(
      'Kim,Quill,kim.q@example.com,Leeds',
      'Kim,Quill,kim.quill@example.org,Hull'
    );

    expect(find(dataset)).toEqual([]);
  });

  it('holds the combined name score to the threshold', () => {
    const near = people(
      'Jon,Smith,jon@example.com,Leeds',
      'John,Smith,john@example.org,Leeds'
    );
    const far = people(
      'Mia,Smith,mia@example.com,Leeds',
      'Nia,Smith,nia@example.org,Leeds'
    );

    expect(MIN_NAME_SIMILARITY).toBe(0.92);
    expect(find(near)).toHaveLength(1);
    expect(find(far)).toEqual([]);
  });

  it('finds a pair that sorts apart by first name through the pass that sorts by last name', () => {
    const dataset = people(
      'Dana,Smith,dana@example.com,Leeds',
      'Ana,Smith,ana@example.org,Leeds',
      'Zoe,Frost,zoe@example.com,Perth',
      'Yan,Gale,yan@example.com,Truro'
    );

    expect(find(dataset).map(({ rows }) => rows)).toEqual([[8, 9]]);
  });

  it('matches names ignoring case, padding and spacing', () => {
    const dataset = people(
      'jon ,SMITH,jon@example.com,Leeds',
      ' John,smith,john@example.org,leeds'
    );

    const [candidate] = find(dataset);

    expect(candidate?.rows).toEqual([8, 9]);
    expect(candidate?.evidence.agreeingColumns).toEqual([CITY]);
  });

  it('finds a pair that shares an identifier whatever the names, with the shared column as evidence', () => {
    const dataset = people(
      'Zed,Quill,shared@example.com,Leeds',
      'Moe,Rowan,SHARED@example.com,Hull'
    );

    expect(find(dataset)).toEqual([
      {
        rows: [8, 9],
        similarity: 1,
        evidence: {
          nameSimilarity: expect.any(Number),
          agreeingColumns: [EMAIL],
          sharedIdentifierColumns: [EMAIL],
        },
      },
    ]);
  });

  it('lists a pair once with the evidence of both ways it was found', () => {
    const dataset = people(
      'Jon,Smith,same@example.com,Leeds',
      'John,Smith,SAME@example.com,Leeds'
    );

    const candidates = find(dataset);

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.rows).toEqual([8, 9]);
    expect(candidates[0]?.similarity).toBe(1);
    expect(candidates[0]?.evidence).toMatchObject({
      agreeingColumns: [EMAIL, CITY],
      sharedIdentifierColumns: [EMAIL],
    });
    expect(candidates[0]?.evidence.nameSimilarity).toBeCloseTo(
      (14 / 15 + 1) / 2,
      10
    );
  });

  it('pairs every two rows of a group that shares an identifier', () => {
    const dataset = people(
      'A,One,shared@example.com,X',
      'B,Two,shared@example.com,Y',
      'C,Three,shared@example.com,Z'
    );

    expect(find(dataset).map(({ rows }) => rows)).toEqual([
      [8, 9],
      [8, 10],
      [9, 10],
    ]);
  });

  it('finds rows that share a phone written in different layouts', () => {
    const lines = FIRST_NAMES.map(
      (first, index) =>
        `${first},${LAST_NAMES[index]},212-555-010${index},City ${index}`
    );
    const dataset = toDataset(
      'first_name,last_name,phone,city',
      ...lines,
      'Other,Person,(212) 555-0103,Elsewhere'
    );

    const [candidate] = find(dataset);

    expect(candidate?.rows).toEqual([3, 8]);
    expect(candidate?.evidence.sharedIdentifierColumns).toEqual([
      toColumnKey(2),
    ]);
  });

  it('leaves out rows the exact and normalized duplicate checks remove', () => {
    const dataset = people(
      'ADA,ALDER,Ada@example.com,CITY 0',
      'Jon,Smith,jon@example.com,Leeds',
      'Jon,Smith,jon@example.com,Leeds',
      'John,Smith,john@example.org,Leeds'
    );
    const profile = profileDataset(dataset);

    expect(findExactDuplicates.find({ dataset, profile })[0]?.rows).toEqual([
      9, 10,
    ]);
    expect(find(dataset).map(({ rows }) => rows)).toEqual([[9, 11]]);
  });

  it('still pairs the kept first row of a copied group with a different row sharing its identifier', () => {
    const dataset = people(
      'Ada,Alder,ada@example.com,City 0',
      'Other,Person,ada@example.com,Hull'
    );

    expect(find(dataset).map(({ rows }) => rows)).toEqual([[0, 9]]);
  });

  it('does not pair rows that are only copies of each other', () => {
    const dataset = people(
      'Ada,Alder,ada@example.com,City 0',
      'ADA,alder,ADA@example.com,city 0'
    );

    expect(find(dataset)).toEqual([]);
  });

  it('never pairs on a blank or placeholder name', () => {
    const dataset = people(
      ',Smith,a@example.com,Leeds',
      'John,Smith,b@example.org,Leeds',
      'N/A,Brook,c@example.com,Truro',
      'n/a,Brook,d@example.org,Truro',
      'unknown,,e@example.com,Wells',
      ' ,,f@example.org,Wells'
    );

    expect(find(dataset)).toEqual([]);
  });

  it('still pairs a row with a blank name through a shared identifier', () => {
    const dataset = people(
      ',Smith,same@example.com,Leeds',
      'John,Smith,same@example.com,Hull'
    );

    const [candidate] = find(dataset);

    expect(candidate?.rows).toEqual([8, 9]);
    expect(candidate?.evidence.nameSimilarity).toBeNull();
    expect(candidate?.similarity).toBe(1);
  });

  it('does not count agreement on a value that many rows share', () => {
    const lines = Array.from(
      { length: 40 },
      (_, index) =>
        `Name${index}x,Last${index}y,u${index}@example.com,Town ${index}`
    );
    const crowded = toDataset(
      'first_name,last_name,email,country',
      ...lines.map((line) => `${line.split(',').slice(0, 3).join(',')},Chile`),
      'Jon,Smith,jon@example.com,Chile',
      'John,Smith,john@example.org,Chile'
    );

    expect(find(crowded)).toEqual([]);
  });

  it('skips rows that are entirely blank', () => {
    const dataset = people(',,,', ' , , , ', ',,,');

    expect(find(dataset)).toEqual([]);
  });

  it('works from one name column, sorting once', () => {
    const dataset = toDataset(
      'full_name,city',
      'Ada Alder,City 0',
      'Bo Birch,City 1',
      'Jon Smith,Leeds',
      'John Smith,Leeds',
      'Cy Cedar,City 2'
    );

    expect(find(dataset).map(({ rows }) => rows)).toEqual([[2, 3]]);
    expect(neighborPairs.count).toBeLessThanOrEqual(1 * 5 * NEIGHBOR_WINDOW);
  });

  it('gives only shared-identifier pairs when no column names a person', () => {
    const dataset = toDataset(
      'email,city,note',
      'a@example.com,Leeds,x',
      'b@example.com,Leeds,y',
      'c@example.com,Hull,z',
      'd@example.com,Hull,w',
      'e@example.com,Bath,v',
      'a@example.com,Rye,u'
    );

    const [candidate, ...others] = find(dataset);

    expect(others).toEqual([]);
    expect(candidate?.rows).toEqual([0, 5]);
    expect(candidate?.evidence.nameSimilarity).toBeNull();
    expect(neighborPairs.count).toBe(0);
  });

  it('compares a row with the next five rows and no further', () => {
    expect(NEIGHBOR_WINDOW).toBe(5);
    const between = (count: number) =>
      toDataset(
        'full_name,city',
        'Jon Smith,Leeds',
        ...Array.from(
          { length: count },
          (_, index) => `${FILLER_NAMES[index]} Q,Town ${index}`
        ),
        'John Smith,Leeds'
      );

    expect(find(between(NEIGHBOR_WINDOW - 1))).toHaveLength(1);
    expect(find(between(NEIGHBOR_WINDOW))).toEqual([]);
  });

  it('keeps the strongest MAX_CANDIDATE_PAIRS, by similarity then by agreeing columns then by row', () => {
    expect(MAX_CANDIDATE_PAIRS).toBe(300);
    const pairCount = MAX_CANDIDATE_PAIRS + 5;
    const pairs = Array.from({ length: pairCount }, (_, index) => {
      const city = index % 2 === 0 ? `Shared ${index}` : null;
      return [
        `First${index}a,Last${index}a,pair${index}@example.com,${city ?? `Left ${index}`}`,
        `First${index}b,Last${index}b,pair${index}@example.com,${city ?? `Right ${index}`}`,
      ];
    });
    const uniqueLines = Array.from(
      { length: 4 * pairCount },
      (_, index) =>
        `Solo${index},Only${index},solo${index}@example.com,Solo ${index}`
    );
    const dataset = toDataset(HEADER, ...pairs.flat(), ...uniqueLines);

    const candidates = find(dataset);

    const evenPairs = Array.from(
      { length: pairCount },
      (_, index) => index
    ).filter((index) => index % 2 === 0);
    const oddPairs = Array.from(
      { length: pairCount },
      (_, index) => index
    ).filter((index) => index % 2 === 1);
    const expectedFirstRows = [...evenPairs, ...oddPairs]
      .slice(0, MAX_CANDIDATE_PAIRS)
      .map((index) => 2 * index);
    expect(candidates).toHaveLength(MAX_CANDIDATE_PAIRS);
    expect(candidates.map(({ rows }) => rows[0])).toEqual(expectedFirstRows);
    expect(candidates.every(({ similarity }) => similarity === 1)).toBe(true);
  });

  it('puts the strongest pair first: a shared identifier with more agreement, then an exact name, then a near name', () => {
    const dataset = people(
      'Jon,Smith,jon@example.com,Leeds',
      'John,Smith,john@example.org,Leeds',
      'Mo,Quill,mo@example.com,Hull',
      'Mo,Quill,mo.q@example.org,Hull',
      'Ivy,Reed,ivy@example.com,Bath',
      'Zed,Moss,IVY@example.com,Bath'
    );

    const candidates = find(dataset);

    expect(candidates.map(({ rows }) => rows)).toEqual([
      [12, 13],
      [10, 11],
      [8, 9],
    ]);
    expect(candidates.map(({ similarity }) => similarity)).toEqual([
      1,
      1,
      expect.closeTo((14 / 15 + 1) / 2, 10),
    ]);
  });

  it('is deterministic and does not touch the dataset it is given', () => {
    const dataset = people(
      'Jon,Smith,jon@example.com,Leeds',
      'John,Smith,john@example.org,Leeds'
    );

    expect(find(dataset)).toEqual(find(dataset));
  });

  it('makes at most passes times rows times the window comparisons for 100,000 rows', () => {
    const rowCount = 100_000;
    const passes = 2;
    const lines = Array.from(
      { length: rowCount },
      (_, index) =>
        `F${index},L${rowCount - index},u${index}@example.com,Town ${index}`
    );
    const dataset = toDataset(HEADER, ...lines);

    find(dataset);

    expect(neighborPairs.count).toBeGreaterThan(0);
    expect(neighborPairs.count).toBeLessThanOrEqual(
      passes * rowCount * NEIGHBOR_WINDOW
    );
  }, 60_000);
});

function find(dataset: Dataset) {
  return findNearDuplicateCandidates({
    dataset,
    profile: profileDataset(dataset),
  });
}
