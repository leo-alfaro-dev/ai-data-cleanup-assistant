// cspell:ignore Persn Firts
import { describe, expect, it } from 'vitest';
import type { Dataset } from '@/engine/dataset/dataset';
import { toColumnKey } from '@/engine/dataset/toColumnKey';
import { toIssueId } from '@/engine/issues/toIssueId';
import { MAX_ROWS_PER_RECORD } from '@/engine/matching/maxRowsPerRecord';
import { profileDataset } from '@/engine/profile/profileDataset';
import { accept } from '@/engine/testing/accept';
import { changed } from '@/engine/testing/changed';
import { cleanEveryCell } from '@/engine/testing/cleanEveryCell';
import { listRemovedRows } from '@/engine/testing/listRemovedRows';
import { toDataset } from '@/engine/testing/toDataset';
import { watchRowReads } from '@/engine/testing/watchRowReads';
import { findExactDuplicates } from './findExactDuplicates';
import { findNormalizedDuplicates } from './findNormalizedDuplicates';
import { findSharedIdentifiers } from './findSharedIdentifiers';

const NAME = toColumnKey(1);
const EMAIL = toColumnKey(2);
const PHONE = toColumnKey(3);
const CITY = toColumnKey(4);

const HEADER = 'id,name,email,phone,city';

// Twelve distinct people, rows 0 to 11. Anything added starts at row 12.
function customers(...extraLines: string[]): Dataset {
  const people = Array.from({ length: 12 }, (_, index) => {
    const number = index + 1;
    const line = String(number).padStart(2, '0');
    return `${number},Person ${number},p${number}@example.com,212-555-01${line},City ${number}`;
  });

  return toDataset(HEADER, ...people, ...extraLines);
}

describe('findSharedIdentifiers', () => {
  it('finds the same email under a different name casing and suggests merging into the first', () => {
    const dataset = customers('13,PERSON 1,P1@Example.com,,');

    const issues = find(dataset);

    expect(issues).toEqual([
      {
        id: toIssueId('shared-identifiers:0'),
        category: 'duplicate',
        source: 'check',
        confidence: 'high',
        rows: [0, 12],
        column: null,
        suggestion: { kind: 'mergeRows', keep: 0, remove: [12], values: [] },
        details: {
          kind: 'sharedIdentifiers',
          links: [{ column: EMAIL, value: 'p1@example.com', rows: [0, 12] }],
          hasConflictingNames: false,
        },
      },
    ]);
    expect(listRemovedRows({ dataset, issues })).toEqual([12]);
  });

  it('finds the same phone digits in different layouts', () => {
    const dataset = customers('13,Person 2,other@example.com,(212) 555-0102,');

    const [issue] = find(dataset);

    expect(issue?.rows).toEqual([1, 12]);
    expect(issue?.details).toEqual({
      kind: 'sharedIdentifiers',
      links: [{ column: PHONE, value: '2125550102', rows: [1, 12] }],
      hasConflictingNames: false,
    });
  });

  it('fills the kept row blanks from the later row and keeps what the kept row has', () => {
    const dataset = toDataset(
      HEADER,
      '1,,p1@example.com,,City 1',
      ...customers()
        .rows.slice(1)
        .map((row) => row.join(',')),
      '13,Person 1,P1@example.com,212-555-0199,City 9'
    );
    const issues = find(dataset);

    expect(issues[0]?.suggestion).toEqual({
      kind: 'mergeRows',
      keep: 0,
      remove: [12],
      values: [
        { column: NAME, from: 12 },
        { column: PHONE, from: 12 },
      ],
    });

    const cleaned = cleanEveryCell({
      dataset,
      accepted: issues.flatMap(({ id, suggestion }) =>
        suggestion === null ? [] : [accept({ issue: id, change: suggestion })]
      ),
    });
    const origin = {
      issue: 'shared-identifiers:0',
      kind: 'mergeRows',
    } as const;
    expect(cleaned[0]).toEqual([
      { isChanged: false, value: '1' },
      changed({ value: 'Person 1', ...origin }),
      { isChanged: false, value: 'p1@example.com' },
      changed({ value: '212-555-0199', ...origin }),
      { isChanged: false, value: 'City 1' },
    ]);
    expect(cleaned[12]?.[CITY]).toEqual({ isChanged: false, value: 'City 9' });
    expect(listRemovedRows({ dataset, issues })).toEqual([12]);
  });

  it('takes each blank from the first later row that has a value', () => {
    const dataset = replaceFirstRow(
      '1,,p1@example.com,,',
      '13,,p1@example.com,,City 7',
      '14,Person 1,p1@example.com,212-555-0150,City 8'
    );

    expect(find(dataset)[0]?.suggestion).toEqual({
      kind: 'mergeRows',
      keep: 0,
      remove: [12, 13],
      values: [
        { column: NAME, from: 13 },
        { column: PHONE, from: 13 },
        { column: CITY, from: 12 },
      ],
    });
  });

  it('copies no placeholder into a blank cell', () => {
    const dataset = replaceFirstRow(
      '1,,p1@example.com,,',
      '13,N/A,p1@example.com,N/A,unknown',
      '14,Person 1,p1@example.com,,'
    );

    expect(find(dataset)[0]?.suggestion).toEqual({
      kind: 'mergeRows',
      keep: 0,
      remove: [12, 13],
      values: [{ column: NAME, from: 13 }],
    });
  });

  it('suggests a merge with no choices when there is nothing to fill', () => {
    const dataset = customers('13,Person 1,p1@example.com,212-555-0101,City 1');

    expect(find(dataset)[0]?.suggestion).toEqual({
      kind: 'mergeRows',
      keep: 0,
      remove: [12],
      values: [],
    });
  });

  it('groups three rows sharing one value into one issue', () => {
    const dataset = customers(
      '13,PERSON 1,p1@example.com,,',
      '14,person 1,P1@EXAMPLE.COM,,'
    );

    const issues = find(dataset);

    expect(issues).toHaveLength(1);
    expect(issues[0]?.rows).toEqual([0, 12, 13]);
    expect(issues[0]?.suggestion).toMatchObject({ keep: 0, remove: [12, 13] });
    expect(listRemovedRows({ dataset, issues })).toEqual([12, 13]);
  });

  it('joins groups that overlap into one issue with a link per shared value', () => {
    const dataset = customers(
      '13,Person 1,p1@example.com,212-555-0150,',
      '14,PERSON 1,p1b@example.com,212-555-0150,'
    );

    const issues = find(dataset);

    expect(issues).toHaveLength(1);
    expect(issues[0]?.id).toBe(toIssueId('shared-identifiers:0'));
    expect(issues[0]?.rows).toEqual([0, 12, 13]);
    expect(issues[0]?.details).toEqual({
      kind: 'sharedIdentifiers',
      links: [
        { column: EMAIL, value: 'p1@example.com', rows: [0, 12] },
        { column: PHONE, value: '2125550150', rows: [12, 13] },
      ],
      hasConflictingNames: false,
    });
  });

  it('makes one issue, not two, for two rows that share an email and a phone', () => {
    const dataset = customers('13,Person 1,P1@example.com,212 555 0101,');

    const [issue, ...others] = find(dataset);

    expect(others).toEqual([]);
    expect(issue?.details).toMatchObject({
      links: [{ column: EMAIL }, { column: PHONE }],
    });
  });

  it('keeps separate records in separate issues, ordered by first row', () => {
    const dataset = customers(
      '13,Four,p4@example.com,,',
      '14,One,p1@example.com,,'
    );

    expect(find(dataset).map(({ id, rows }) => ({ id, rows }))).toEqual([
      { id: toIssueId('shared-identifiers:0'), rows: [0, 13] },
      { id: toIssueId('shared-identifiers:3'), rows: [3, 12] },
    ]);
  });

  it('leaves exact copies to the exact check and still finds a third row sharing their email', () => {
    const dataset = customers(
      '1,Person 1,p1@example.com,212-555-0101,City 1',
      '13,Person 1,p1@example.com,,'
    );

    const issues = find(dataset);
    const exact = findExactDuplicates.find({
      dataset,
      profile: profileDataset(dataset),
    });

    expect(issues.map(({ rows }) => rows)).toEqual([[0, 13]]);
    expect(listRemovedRows({ dataset, issues: exact })).toEqual([12]);
    expect(listRemovedRows({ dataset, issues: [...exact, ...issues] })).toEqual(
      [12, 13]
    );
  });

  it('finds nothing in rows that are only exact or normalized copies of each other', () => {
    const dataset = customers(
      '1,Person 1,p1@example.com,212-555-0101,City 1',
      '1,PERSON 1,P1@example.com,212-555-0101,CITY 1'
    );
    const profile = profileDataset(dataset);

    expect(find(dataset)).toEqual([]);
    expect(findExactDuplicates.find({ dataset, profile })).toHaveLength(1);
    expect(findNormalizedDuplicates.find({ dataset, profile })).toHaveLength(1);
  });

  it('ignores blank cells and placeholders', () => {
    const dataset = customers(
      '13,A,,,',
      '14,B,,,',
      '15,C,N/A,-,',
      '16,D,n/a,unknown,',
      '17,E, ,NULL,'
    );

    expect(find(dataset)).toEqual([]);
  });

  it('does not pair phones with too few digits to be a phone', () => {
    const dataset = customers(
      '13,A,a@example.com,555,',
      '14,B,b@example.com,555,'
    );

    expect(find(dataset)).toEqual([]);
  });

  it('finds a shared column that is named as a key', () => {
    const dataset = toDataset(
      'customer_id,name,city',
      'C-1,Bo,Leeds',
      'C-2,Cy,Hull',
      'C-3,Di,York',
      'C-4,Ed,Bath',
      'C-5,Flo,Rye',
      'C-6,Gus,Ely',
      'c-1 ,Bo,'
    );

    const [issue] = find(dataset);

    expect(issue?.rows).toEqual([0, 6]);
    expect(issue?.details).toEqual({
      kind: 'sharedIdentifiers',
      links: [{ column: toColumnKey(0), value: 'c-1', rows: [0, 6] }],
      hasConflictingNames: false,
    });
  });

  it('finds a shared numeric key', () => {
    const dataset = toDataset(
      'id,name',
      '1,Bo',
      '2,Cy',
      '3,Di',
      '4,Ed',
      '5,Flo',
      '6,Gus',
      '1,Bo P'
    );

    expect(find(dataset).map(({ rows }) => rows)).toEqual([[0, 6]]);
  });

  it('leaves a column alone when neither its header nor its values say identifier', () => {
    const dataset = toDataset(
      'name,city',
      'Bo,Leeds',
      'Cy,Hull',
      'Di,York',
      'Ed,Bath',
      'Flo,Rye',
      'Gus,Ely',
      'Bo,Reading',
      'Cy,Hull'
    );

    expect(find(dataset)).toEqual([]);
  });

  it('gives nothing for an email column where one address repeats on every order line', () => {
    const lines = Array.from(
      { length: 12 },
      (_, index) =>
        `${index + 1},Person,${index % 3 === 0 ? 'bo' : 'cy'}@example.com,212-555-0101,Leeds`
    );
    const dataset = toDataset(HEADER, ...lines);

    expect(profileDataset(dataset)[EMAIL]?.dominantType).toBe('email');
    expect(find(dataset)).toEqual([]);
  });

  it('still finds a shared email when one line in five repeats', () => {
    const lines = Array.from(
      { length: 10 },
      (_, index) => `${index + 1},Name ${index},u${index % 9}@example.com,,`
    );

    expect(find(toDataset(HEADER, ...lines)).map(({ rows }) => rows)).toEqual([
      [0, 9],
    ]);
  });

  it('leaves out an address held by more rows than one record can have', () => {
    const lines = Array.from({ length: 60 }, (_, index) => {
      const isShared = index <= MAX_ROWS_PER_RECORD;
      const email = isShared ? 'info@example.com' : `u${index}@example.com`;
      return `${index},Name ${index},${email},,`;
    });

    expect(find(toDataset(HEADER, ...lines))).toEqual([]);
  });

  it('keeps an address on as many rows as one record can have', () => {
    const lines = Array.from({ length: 60 }, (_, index) => {
      const isShared = index < MAX_ROWS_PER_RECORD;
      const email = isShared ? 'info@example.com' : `u${index}@example.com`;
      return `${index},Name ${index},${email},,`;
    });

    const [issue] = find(toDataset(HEADER, ...lines));

    expect(issue?.rows).toHaveLength(MAX_ROWS_PER_RECORD);
  });

  it('keeps a chain of overlapping groups that is as long as one record can be', () => {
    const [issue] = find(chainedRows(MAX_ROWS_PER_RECORD));

    expect(issue?.rows).toHaveLength(MAX_ROWS_PER_RECORD);
  });

  it('leaves out a chain of overlapping groups that grows past one record', () => {
    expect(find(chainedRows(MAX_ROWS_PER_RECORD + 1))).toEqual([]);
  });

  it('gives nothing for a file with no identifier column, one row or only blank rows', () => {
    expect(find(toDataset('name,city', 'Bo,Leeds', 'Bo,Leeds'))).toEqual([]);
    expect(find(toDataset(HEADER, '1,Bo,bo@example.com,,'))).toEqual([]);
    expect(find(toDataset(HEADER, ',,,,', ' , , , ,'))).toEqual([]);
  });

  it('gives nothing when every row is distinct', () => {
    expect(find(customers())).toEqual([]);
  });

  it('pads ragged rows and finds a shared value in them', () => {
    const dataset = customers('13,Person 1,p1@example.com', '14,Person');

    const [issue] = find(dataset);

    expect(issue?.rows).toEqual([0, 12]);
  });

  it('keeps the issue but suggests no merge when the rows share a phone and not a name', () => {
    const dataset = toDataset(
      'first_name,last_name,email,phone',
      'Ana,Diaz,ana@acme.example.com,(612) 555-0100',
      'Luis,Moreno,luis@acme.example.com,(612) 555-0100',
      'Mei,Chen,,(612) 555-0100',
      ...Array.from(
        { length: 17 },
        (_, index) =>
          `Person${index},Other${index},p${index}@example.org,(212) 555-${String(100 + index).padStart(4, '0')}`
      )
    );

    const issues = find(dataset);

    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      confidence: 'medium',
      rows: [0, 1, 2],
      suggestion: null,
      details: { kind: 'sharedIdentifiers', hasConflictingNames: true },
    });
    expect(listRemovedRows({ dataset, issues })).toEqual([]);
  });

  describe('with a first and a last name', () => {
    const HEADER_WITH_NAMES = 'first_name,last_name,email,phone';

    function withNames(...extraLines: string[]): Dataset {
      const people = Array.from(
        { length: 12 },
        (_, index) =>
          `First${index},Last${index},p${index}@example.com,212-555-01${String(index).padStart(2, '0')}`
      );

      return toDataset(HEADER_WITH_NAMES, ...people, ...extraLines);
    }

    it.each([
      {
        name: 'John Smith and Jane Smith',
        kept: 'John,Smith',
        other: 'Jane,Smith',
      },
      {
        name: 'Daniel Garcia and Danielle Garcia',
        kept: 'Daniel,Garcia',
        other: 'Danielle,Garcia',
      },
      {
        name: 'Chris Brown and Christine Brown',
        kept: 'Chris,Brown',
        other: 'Christine,Brown',
      },
    ])('keeps $name apart on a shared email', ({ kept, other }) => {
      const dataset = withNames(
        `${kept},family@example.com,212-555-0150`,
        `${other},family@example.com,212-555-0151`
      );

      const [issue] = find(dataset);

      expect(issue).toMatchObject({
        confidence: 'medium',
        suggestion: null,
        details: { hasConflictingNames: true },
      });
    });

    it('merges rows whose names differ by one letter in each column', () => {
      const dataset = withNames('Firts1,Last1,p1@example.com,');

      const [issue] = find(dataset);

      expect(issue?.confidence).toBe('high');
      expect(issue?.suggestion).toMatchObject({ kind: 'mergeRows', keep: 1 });
    });

    it('suggests no merge when only one of the removed rows has another name', () => {
      const dataset = withNames(
        'First1,Last1,p1@example.com,',
        'Other,Person,p1@example.com,'
      );

      const [issue] = find(dataset);

      expect(issue?.rows).toEqual([1, 12, 13]);
      expect(issue?.suggestion).toBeNull();
      expect(issue?.details).toMatchObject({ hasConflictingNames: true });
    });
  });

  it('merges when only a typo separates the names', () => {
    const dataset = customers('13,Persn 1,p1@example.com,,');

    const [issue] = find(dataset);

    expect(issue?.confidence).toBe('high');
    expect(issue?.suggestion).toMatchObject({ kind: 'mergeRows', keep: 0 });
  });

  it('does not compare a name one of the rows lacks', () => {
    const dataset = customers('13,,p1@example.com,,');

    const [issue] = find(dataset);

    expect(issue?.confidence).toBe('high');
    expect(issue?.details).toMatchObject({ hasConflictingNames: false });
  });

  it('suggests the merge when the file has no name column to compare', () => {
    const dataset = toDataset(
      'id,email,city',
      ...Array.from(
        { length: 8 },
        (_, index) => `${index},u${index}@example.com,City ${index}`
      ),
      '8,u0@example.com,Elsewhere'
    );

    const [issue] = find(dataset);

    expect(issue?.confidence).toBe('high');
    expect(issue?.suggestion).toMatchObject({ kind: 'mergeRows', keep: 0 });
  });

  it('is deterministic', () => {
    const dataset = customers(
      '13,One,p1@example.com,,',
      '14,Two,p2@example.com,,'
    );

    expect(find(dataset)).toEqual(find(dataset));
  });

  it('reads rows a number of times that grows in step with the file', () => {
    function readsFor(rowCount: number): number {
      const lines = Array.from(
        { length: rowCount },
        (_, index) => `${index},Name ${index},u${index}@example.com,,`
      );
      const dataset = toDataset(HEADER, ...lines);
      const watched = watchRowReads(dataset);

      findSharedIdentifiers.find({
        dataset: watched.dataset,
        profile: profileDataset(dataset),
      });

      return watched.reads.filter((property) => /^\d+$/.test(property)).length;
    }

    expect(readsFor(2000)).toBeLessThanOrEqual(2 * readsFor(1000));
  });
});

function find(dataset: Dataset) {
  return findSharedIdentifiers.find({
    dataset,
    profile: profileDataset(dataset),
  });
}

// Rows 0 to length - 1 form one chain, each linked to the next by an email or a phone in turn.
// Distinct rows follow so both columns stay mostly distinct.
function chainedRows(length: number): Dataset {
  const chain = Array.from({ length }, (_, index) => {
    const email = `chain${Math.floor(index / 2)}@example.com`;
    const phone = `212-555-${String(1000 + Math.floor((index + 1) / 2))}`;
    return `${index},Chained ${index},${email},${phone},`;
  });
  const distinct = Array.from({ length: 100 }, (_, index) => {
    const row = length + index;
    return `${row},Distinct ${row},d${row}@example.com,212-556-${String(1000 + row)},`;
  });

  return toDataset(HEADER, ...chain, ...distinct);
}

function replaceFirstRow(firstRow: string, ...extraLines: string[]): Dataset {
  const rest = customers()
    .rows.slice(1)
    .map((row) => row.join(','));

  return toDataset(HEADER, firstRow, ...rest, ...extraLines);
}
