import { describe, expect, it } from 'vitest';
import { toColumnKey } from '@/engine/dataset/toColumnKey';
import { profileDataset } from '@/engine/profile/profileDataset';
import { toDataset } from '@/engine/testing/toDataset';
import {
  MAX_COLUMNS_PER_FILE,
  MAX_VALUE_LENGTH,
  MAX_VALUES_PER_REQUEST,
  normalizeValuesRequest,
} from './normalizeValuesContract';
import { MAX_HEADER_LENGTH } from '../../textLimits';
import { buildNormalizeValuesRequests } from './buildNormalizeValuesRequests';

function build(...lines: string[]) {
  const dataset = toDataset(...lines);

  return buildNormalizeValuesRequests({
    profile: profileDataset(dataset),
    headers: dataset.columns.map(({ header }) => header),
    rowCount: dataset.rows.length,
  });
}

function repeat(count: number, line: (index: number) => string): string[] {
  return Array.from({ length: count }, (_, index) => line(index));
}

describe('buildNormalizeValuesRequests', () => {
  it('sends the distinct values of a categorical text column with their counts, most frequent first', () => {
    const lines = [
      'id,state',
      ...repeat(
        100,
        (index) =>
          `${index},${index < 60 ? 'TX' : index < 90 ? 'CA' : 'Calif.'}`
      ),
      ...repeat(100, (index) => `${index + 100},TX`),
    ];

    const [request] = build(...lines);

    expect(request).toEqual({
      column: { key: 1, header: 'state', dominantType: 'text' },
      values: [
        { value: 'TX', count: 160 },
        { value: 'CA', count: 30 },
        { value: 'Calif.', count: 10 },
      ],
      isComplete: true,
    });
    expect(normalizeValuesRequest.safeParse(request).success).toBe(true);
  });

  it('leaves numeric, date and identifier columns out of a large file', () => {
    const lines = [
      'id,amount,signup,state',
      ...repeat(
        300,
        (index) =>
          `ID${index},${index % 7},2024-01-${String((index % 28) + 1).padStart(2, '0')},${index % 2 ? 'TX' : 'Texas'}`
      ),
    ];

    const requests = build(...lines);

    expect(requests.map(({ column }) => column.header)).toEqual(['state']);
  });

  it('puts the most repeated columns first', () => {
    const lines = [
      'plan,country,state',
      ...repeat(
        300,
        (index) =>
          `P${index % 40},${index % 2 ? 'United States' : 'USA'},S${index % 10}`
      ),
    ];

    const requests = build(...lines);

    expect(requests.map(({ column }) => column.header)).toEqual([
      'country',
      'state',
      'plan',
    ]);
  });

  it('leaves a column with fewer than two sendable values out', () => {
    const lines = ['a,b', ...repeat(300, () => 'same,x')];

    expect(build(...lines)).toEqual([]);
  });

  it('keeps every short-text column of a file under the small-file limit, even when no value repeats', () => {
    const request = build(
      'plan,city',
      'Starter,London',
      'Business,Wilmslow',
      'Team,New York',
      'Pro,Hampton'
    );

    expect(request.map(({ column }) => column.header)).toEqual([
      'plan',
      'city',
    ]);
    expect(request[0]?.values).toHaveLength(4);
  });

  it('leaves out the columns of names and identifiers, though a small file sends every text column', () => {
    const request = build(
      'customer_id,first_name,customer,city',
      'C-1,Nia,Nia Allen,Austin',
      'C-2,Marcus,Marcus Singh,Boston',
      'C-3,Ana,Ana Perez,Denver'
    );

    expect(request.map(({ column }) => column.header)).toEqual(['city']);
  });

  it('leaves a column that does not repeat out of a file that is not small', () => {
    const lines = ['name', ...repeat(300, (index) => `Person number ${index}`)];

    expect(build(...lines)).toEqual([]);
  });

  it('does not send a value longer than the cap, and says the list is not complete', () => {
    const long = 'x'.repeat(MAX_VALUE_LENGTH + 1);
    const lines = [
      'state',
      ...repeat(100, () => 'TX'),
      ...repeat(100, () => 'CA'),
      ...repeat(10, () => long),
    ];

    const [request] = build(...lines);

    expect(request?.values.map(({ value }) => value)).toEqual(['TX', 'CA']);
    expect(request?.isComplete).toBe(false);
  });

  it('shortens a header longer than the cap, so the request still passes its contract', () => {
    const header = 'h'.repeat(MAX_HEADER_LENGTH + 150);
    const lines = [
      header,
      ...repeat(100, () => 'TX'),
      ...repeat(100, () => 'CA'),
    ];

    const [request] = build(...lines);

    expect(request?.column.header).toBe(`${'h'.repeat(MAX_HEADER_LENGTH)}…`);
    expect(normalizeValuesRequest.safeParse(request).success).toBe(true);
  });

  it('sends a value as long as the cap whole', () => {
    const edge = 'y'.repeat(MAX_VALUE_LENGTH);
    const lines = [
      'state',
      ...repeat(100, () => edge),
      ...repeat(100, () => 'CA'),
    ];

    const [request] = build(...lines);

    expect(request?.values.map(({ value }) => value)).toContain(edge);
  });

  it('sends at most the cap of values, most frequent first, and says the list is not complete', () => {
    const distinct = MAX_VALUES_PER_REQUEST + 50;
    const profile = [
      {
        column: toColumnKey(0),
        blankCount: 0,
        nonBlankCount: distinct * 2,
        distinctCount: distinct,
        distinctValues: Array.from({ length: distinct }, (_, index) => ({
          value: `Value ${index}`,
          count: distinct - index,
        })),
        hasTruncatedDistinctValues: false,
        isCategorical: true,
        isIdentifierLike: false,
        typeCounts: {
          integer: 0,
          decimal: 0,
          boolean: 0,
          date: 0,
          email: 0,
          phone: 0,
          url: 0,
          text: distinct * 2,
        },
        dominantType: 'text' as const,
      },
    ];

    const [request] = buildNormalizeValuesRequests({
      profile,
      headers: ['state'],
      rowCount: 10_000,
    });

    expect(request?.values).toHaveLength(MAX_VALUES_PER_REQUEST);
    expect(request?.values[0]).toEqual({ value: 'Value 0', count: distinct });
    expect(request?.isComplete).toBe(false);
  });

  it('sends at most the cap of columns', () => {
    const headers = Array.from(
      { length: MAX_COLUMNS_PER_FILE + 4 },
      (_, index) => `c${index}`
    );
    const lines = [
      headers.join(','),
      ...repeat(300, (row) =>
        headers.map((_, column) => `V${row % (column + 2)}`).join(',')
      ),
    ];

    const requests = build(...lines);

    expect(requests).toHaveLength(MAX_COLUMNS_PER_FILE);
  });

  it('names an empty header as it is, since the model sees what the file says', () => {
    const lines = [
      'id,',
      ...repeat(300, (index) => `${index},${index % 2 ? 'a' : 'b'}`),
    ];

    const [request] = build(...lines);

    expect(request?.column.header).toBe('');
  });

  it('sends the values as the profile holds them, with spaces normalized', () => {
    const lines = [
      'state',
      ...repeat(100, () => 'TX'),
      ...repeat(100, () => '  New   York '),
    ];

    const [request] = build(...lines);

    expect(request?.values.map(({ value }) => value).sort()).toEqual([
      'New York',
      'TX',
    ]);
  });
});
