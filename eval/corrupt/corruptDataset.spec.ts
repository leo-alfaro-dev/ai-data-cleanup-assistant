import { describe, expect, it } from 'vitest';
import type { Row } from '@/engine/dataset/dataset';
import { isBlank } from '@/engine/values/isBlank';
import { normalizeWhitespace } from '@/engine/values/normalizeWhitespace';
import { parseDate } from '@/engine/values/parseDate';
import { toComparisonKey } from '@/engine/values/toComparisonKey';
import { createRandom } from '../generate/createRandom';
import type { Customer } from '../generate/customer';
import { CUSTOMER_COLUMNS } from '../generate/customerColumns';
import { CUSTOMERS_SEED } from '../generate/customerDatasetSettings';
import { EMAIL_DOMAINS } from '../generate/emailDomains';
import { generateCustomers } from '../generate/generateCustomers';
import { getAt } from '../generate/getAt';
import { LOCATIONS } from '../generate/locations';
import { PLANS } from '../generate/plans';
import { toCustomerRow } from '../generate/toCustomerRow';
import { corruptDataset } from './corruptDataset';
import { isOneEditApart } from '@/engine/values/isOneEditApart';
import { PLACEHOLDERS } from './placeholders';
import type { PlantedKind } from './plantedKind';
import type { PlantedError } from './truth';

const SEEDS = [CUSTOMERS_SEED, 1, 2];

const ID_COLUMN = CUSTOMER_COLUMNS.indexOf('customer_id');
const NAME_COLUMNS = columnIndexes(['first_name', 'last_name']);
const EMAIL_COLUMN = CUSTOMER_COLUMNS.indexOf('email');
const PHONE_COLUMN = CUSTOMER_COLUMNS.indexOf('phone');
const SPEND_COLUMN = CUSTOMER_COLUMNS.indexOf('monthly_spend');

describe.each(SEEDS)('corruptDataset, seed %i', (seed) => {
  const { cleanCustomers, rows, errors } = corruptSeed(seed);
  const duplicates = errors.filter((error) => error.category === 'duplicate');
  const valueErrors = errors.filter((error) => error.category !== 'duplicate');
  const cleanById = new Map(
    cleanCustomers.map((customer): [string, Customer] => [
      customer.customer_id,
      customer,
    ])
  );
  const copyRows = new Set<number>(
    duplicates.map((duplicate) => duplicate.copy)
  );

  it('plants the configured count of each kind', () => {
    expect(countByKind(errors)).toEqual({
      'duplicate/exactCopy': 70,
      'duplicate/nameTypo': 30,
      'duplicate/casing': 20,
      'duplicate/phoneFormat': 20,
      'duplicate/blankedField': 10,
      'inconsistent/stateVariant': 40,
      'inconsistent/casing': 30,
      'inconsistent/spacing': 30,
      'inconsistent/dateFormat': 30,
      'missing/blank': 30,
      'missing/placeholder': 25,
      'suspicious/spendTimes100': 10,
      'suspicious/negativeSpend': 5,
      'suspicious/emailWithoutAt': 5,
      'suspicious/emailDomainTypo': 10,
      'suspicious/formulaLike': 1,
    });
  });

  it('adds one row per copy to the clean rows', () => {
    expect(cleanCustomers).toHaveLength(1000);
    expect(rows).toHaveLength(1150);
  });

  describe('duplicates', () => {
    it('places every copy after its original', () => {
      expect(
        duplicates.filter((duplicate) => duplicate.copy <= duplicate.original)
      ).toEqual([]);
    });

    it('copies a few originals twice, and none more often', () => {
      const copiesPerOriginal = new Map<number, number>();
      for (const { original } of duplicates) {
        copiesPerOriginal.set(
          original,
          (copiesPerOriginal.get(original) ?? 0) + 1
        );
      }
      const counts = [...copiesPerOriginal.values()];

      expect(counts.filter((count) => count === 2)).toHaveLength(3);
      expect(Math.max(...counts)).toBe(2);
    });

    it('makes an exact copy identical to its original, id included', () => {
      const exactCopies = duplicates.filter(
        (duplicate) => duplicate.kind === 'exactCopy'
      );

      expect(exactCopies).toHaveLength(70);
      for (const { original, copy } of exactCopies) {
        expect(rowAt(copy)).toEqual(rowAt(original));
      }
    });

    it('gives a near copy a new id and exactly one other difference', () => {
      const nearCopies = duplicates.filter(
        (duplicate) => duplicate.kind !== 'exactCopy'
      );

      expect(nearCopies).toHaveLength(80);
      for (const { original, copy } of nearCopies) {
        const columns = differingColumns({
          first: rowAt(original),
          second: rowAt(copy),
        });

        expect(columns).toHaveLength(2);
        expect(columns).toContain(ID_COLUMN);
      }
    });

    it('gives near copies ids no other row has, in file order', () => {
      const copyIds = duplicates
        .filter((duplicate) => duplicate.kind !== 'exactCopy')
        .map((duplicate) => idOf(rowAt(duplicate.copy)));
      const otherIds = rows
        .filter((_, index) => !copyIds.includes(idOf(rowAt(index))))
        .map(idOf);

      expect(copyIds.some((id) => otherIds.includes(id))).toBe(false);
      expect(new Set(copyIds).size).toBe(copyIds.length);
      expect(copyIds.every((id) => !cleanById.has(id))).toBe(true);
      expect(copyIds).toEqual([...copyIds].sort());
    });

    it('changes a name by one edit in a name typo', () => {
      for (const { original, copy } of ofKind('duplicate', 'nameTypo')) {
        const column = changedColumn({ original, copy });

        expect(NAME_COLUMNS).toContain(column);
        expect(
          isOneEditApart({
            first: cellAt({ row: original, column }),
            second: cellAt({ row: copy, column }),
          })
        ).toBe(true);
      }
    });

    it('changes the case of a name or the email in a casing copy', () => {
      for (const { original, copy } of ofKind('duplicate', 'casing')) {
        const column = changedColumn({ original, copy });
        const before = cellAt({ row: original, column });
        const after = cellAt({ row: copy, column });

        expect([...NAME_COLUMNS, EMAIL_COLUMN]).toContain(column);
        expect(after).not.toBe(before);
        expect(toComparisonKey(after)).toBe(toComparisonKey(before));
      }
    });

    it('keeps the phone digits and changes the layout in a phone copy', () => {
      for (const { original, copy } of ofKind('duplicate', 'phoneFormat')) {
        const before = cellAt({ row: original, column: PHONE_COLUMN });
        const after = cellAt({ row: copy, column: PHONE_COLUMN });

        expect(after).not.toBe(before);
        expect(after.replace(/\D/g, '')).toBe(before.replace(/\D/g, ''));
      }
    });

    it('empties one cell in a blanked copy', () => {
      for (const { original, copy } of ofKind('duplicate', 'blankedField')) {
        const column = changedColumn({ original, copy });

        expect(cellAt({ row: copy, column })).toBe('');
        expect(isBlank(cellAt({ row: original, column }))).toBe(false);
      }
    });
  });

  describe('truth', () => {
    it('matches the dirty cell and the clean value of every value error', () => {
      expect(valueErrors).toHaveLength(216);
      for (const error of valueErrors) {
        const clean = cleanCustomerOf(error.rowId);

        expect(cellAt({ row: error.rowId, column: error.column })).toBe(
          error.corruptedValue
        );
        expect(error.cleanValue).toBe(toCustomerRow(clean).at(error.column));
        expect(error.corruptedValue).not.toBe(error.cleanValue);
      }
    });

    it('records every difference between the dirty and the clean data', () => {
      const recorded = new Set(
        valueErrors.map((error) => `${error.rowId}:${error.column}`)
      );
      const unrecorded = rows.flatMap((row, rowId) => {
        if (copyRows.has(rowId)) return [];

        const clean = toCustomerRow(cleanCustomerOf(rowId));

        return differingColumns({ first: clean, second: row })
          .filter((column) => !recorded.has(`${rowId}:${column}`))
          .map((column) => `${rowId}:${column}`);
      });

      expect(unrecorded).toEqual([]);
    });

    it('keeps the original of each copy exactly as generated', () => {
      for (const { original } of duplicates) {
        expect(rowAt(original)).toEqual(
          toCustomerRow(cleanCustomerOf(original))
        );
      }
    });

    it('puts no cell under two errors, and no value error in a duplicate pair', () => {
      const cells = valueErrors.map(
        (error) => `${error.rowId}:${error.column}`
      );
      const pairRows = new Set<number>(
        duplicates.flatMap((duplicate) => [duplicate.original, duplicate.copy])
      );

      expect(new Set(cells).size).toBe(cells.length);
      expect(valueErrors.filter((error) => pairRows.has(error.rowId))).toEqual(
        []
      );
    });

    it('puts at most one value error on a row', () => {
      const rowIds = valueErrors.map((error) => error.rowId);

      expect(new Set(rowIds).size).toBe(rowIds.length);
    });

    it('never touches the customer id of a value error', () => {
      expect(valueErrors.filter((error) => error.column === ID_COLUMN)).toEqual(
        []
      );
    });
  });

  describe('inconsistent values', () => {
    it('writes a state as its full name or its abbreviation', () => {
      const stateErrors = ofKind('inconsistent', 'stateVariant');

      for (const error of stateErrors) {
        const location = LOCATIONS.find(
          (candidate) => candidate.state === error.cleanValue
        );

        expect(error.column).toBe(CUSTOMER_COLUMNS.indexOf('state'));
        expect([location?.stateName, location?.stateAbbreviation]).toContain(
          error.corruptedValue
        );
      }
      expect(
        new Set(stateErrors.map((error) => error.corruptedValue)).size
      ).toBeGreaterThan(12);
    });

    it('changes only the case of a city, state or plan', () => {
      for (const error of ofKind('inconsistent', 'casing')) {
        expect(columnIndexes(['city', 'state', 'plan'])).toContain(
          error.column
        );
        expect(toComparisonKey(error.corruptedValue)).toBe(
          toComparisonKey(error.cleanValue)
        );
      }
    });

    it('pads a name or a city, leaving what whitespace normalizing removes', () => {
      for (const error of ofKind('inconsistent', 'spacing')) {
        expect(columnIndexes(['first_name', 'last_name', 'city'])).toContain(
          error.column
        );
        expect(normalizeWhitespace(error.corruptedValue)).toBe(
          error.cleanValue
        );
      }
    });

    it('uses a non-breaking space at the edge of a value', () => {
      const corrupted = ofKind('inconsistent', 'spacing').map(
        (error) => error.corruptedValue
      );

      expect(corrupted.some((value) => /^\u00a0|\u00a0$/.test(value))).toBe(
        true
      );
    });

    it('doubles an inner space or swaps it for a non-breaking space', () => {
      const inner = ofKind('inconsistent', 'spacing')
        .map((error) => error.corruptedValue.trim())
        .filter((value) => /\s{2}|\u00a0/.test(value));

      expect(inner.some((value) => value.includes('  '))).toBe(true);
      expect(inner.some((value) => value.includes('\u00a0'))).toBe(true);
    });

    it('rewrites a signup date as MM/DD/YYYY, some of them ambiguous', () => {
      const dateErrors = ofKind('inconsistent', 'dateFormat');

      for (const error of dateErrors) {
        const [year, month, day] = error.cleanValue.split('-');

        expect(error.column).toBe(CUSTOMER_COLUMNS.indexOf('signup_date'));
        expect(error.corruptedValue).toBe(`${month}/${day}/${year}`);
      }
      expect(
        dateErrors.some(
          (error) => parseDate(error.corruptedValue)?.isAmbiguous === true
        )
      ).toBe(true);
      expect(
        dateErrors.some(
          (error) => parseDate(error.corruptedValue)?.isAmbiguous === false
        )
      ).toBe(true);
    });
  });

  describe('missing data', () => {
    it('empties cells other than the id', () => {
      for (const error of ofKind('missing', 'blank')) {
        expect(error.corruptedValue).toBe('');
        expect(error.column).not.toBe(ID_COLUMN);
      }
    });

    it('fills cells other than the id with a placeholder, using all four', () => {
      const placeholderErrors = ofKind('missing', 'placeholder');

      for (const error of placeholderErrors) {
        expect(PLACEHOLDERS).toContain(error.corruptedValue);
        expect(error.column).not.toBe(ID_COLUMN);
      }
      expect(
        new Set(placeholderErrors.map((error) => error.corruptedValue))
      ).toEqual(new Set(PLACEHOLDERS));
    });

    it('uses TBD only where a value can be pending', () => {
      const pendingColumns = columnIndexes([
        'signup_date',
        'plan',
        'monthly_spend',
      ]);

      for (const error of ofKind('missing', 'placeholder')) {
        if (error.corruptedValue === 'TBD')
          expect(pendingColumns).toContain(error.column);
      }
    });
  });

  describe('suspicious records', () => {
    const highestSpend = Math.max(
      ...PLANS.map((plan) => (plan.baseCents + plan.maxUsageCents) / 100)
    );

    it('multiplies a non-zero spend by 100, past every plan range', () => {
      for (const error of ofKind('suspicious', 'spendTimes100')) {
        expect(error.column).toBe(SPEND_COLUMN);
        expect(Number(error.cleanValue)).toBeGreaterThan(0);
        expect(Number(error.corruptedValue)).toBeCloseTo(
          Number(error.cleanValue) * 100,
          2
        );
        expect(Number(error.corruptedValue)).toBeGreaterThan(highestSpend);
      }
    });

    it('negates a non-zero spend', () => {
      for (const error of ofKind('suspicious', 'negativeSpend')) {
        expect(error.column).toBe(SPEND_COLUMN);
        expect(Number(error.cleanValue)).toBeGreaterThan(0);
        expect(error.corruptedValue).toBe(`-${error.cleanValue}`);
      }
    });

    it('drops the @ of an email', () => {
      for (const error of ofKind('suspicious', 'emailWithoutAt')) {
        expect(error.column).toBe(EMAIL_COLUMN);
        expect(error.corruptedValue).not.toContain('@');
        expect([
          error.cleanValue.replace('@', ''),
          error.cleanValue.replace('@', '.'),
        ]).toContain(error.corruptedValue);
      }
    });

    it('moves an email domain one edit from a real one, to a domain that is not real', () => {
      for (const error of ofKind('suspicious', 'emailDomainTypo')) {
        const [cleanLocal, cleanDomain = ''] = error.cleanValue.split('@');
        const [local, domain = ''] = error.corruptedValue.split('@');

        expect(error.column).toBe(EMAIL_COLUMN);
        expect(local).toBe(cleanLocal);
        expect(EMAIL_DOMAINS).not.toContain(domain);
        expect(isOneEditApart({ first: cleanDomain, second: domain })).toBe(
          true
        );
        expect(error.corruptedValue).toMatch(
          /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/
        );
      }
    });

    it('plants exactly one formula-like value', () => {
      const formulaErrors = ofKind('suspicious', 'formulaLike');

      expect(formulaErrors).toHaveLength(1);
      expect(formulaErrors.at(0)?.corruptedValue).toBe(
        '=HYPERLINK("https://example.com/refund","Claim refund")'
      );
    });
  });

  function rowAt(rowId: number): Row {
    return getAt({ items: rows, index: rowId });
  }

  function cellAt({ row, column }: { row: number; column: number }): string {
    return getAt({ items: rowAt(row), index: column });
  }

  function cleanCustomerOf(rowId: number): Customer {
    const clean = cleanById.get(idOf(rowAt(rowId)));
    if (clean === undefined)
      throw new Error(`Row ${rowId} has no clean customer`);

    return clean;
  }

  function changedColumn({
    original,
    copy,
  }: {
    original: number;
    copy: number;
  }): number {
    const columns = differingColumns({
      first: rowAt(original),
      second: rowAt(copy),
    }).filter((candidate) => candidate !== ID_COLUMN);

    expect(columns).toHaveLength(1);

    return getAt({ items: columns, index: 0 });
  }

  function ofKind<Category extends PlantedError['category']>(
    category: Category,
    kind: PlantedKind<Category>
  ) {
    return errors.filter(
      (error): error is Extract<PlantedError, { category: Category }> =>
        error.category === category && error.kind === kind
    );
  }
});

function corruptSeed(seed: number) {
  const random = createRandom(seed);
  const cleanCustomers = generateCustomers({ random, count: 1000 });

  return {
    cleanCustomers,
    ...corruptDataset({ customers: cleanCustomers, random }),
  };
}

function columnIndexes(
  columns: readonly (typeof CUSTOMER_COLUMNS)[number][]
): number[] {
  return columns.map((column) => CUSTOMER_COLUMNS.indexOf(column));
}

function idOf(row: Row): string {
  return getAt({ items: row, index: ID_COLUMN });
}

function differingColumns({
  first,
  second,
}: {
  first: Row;
  second: Row;
}): number[] {
  return first.flatMap((cell, column) =>
    cell === second[column] ? [] : [column]
  );
}

function countByKind(errors: readonly PlantedError[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const { category, kind } of errors) {
    counts[`${category}/${kind}`] = (counts[`${category}/${kind}`] ?? 0) + 1;
  }

  return counts;
}
