import { describe, expect, it } from 'vitest';
import { isBlank } from '@/engine/values/isBlank';
import { detectValueType } from '@/engine/values/detectValueType';
import { normalizeWhitespace } from '@/engine/values/normalizeWhitespace';
import { parseDate } from '@/engine/values/parseDate';
import { toComparisonKey } from '@/engine/values/toComparisonKey';
import { createRandom } from './createRandom';
import type { Customer } from './customer';
import { CUSTOMER_COLUMNS } from './customerColumns';
import { EMAIL_DOMAINS } from './emailDomains';
import { FIRST_NAMES } from './firstNames';
import { generateCustomers } from './generateCustomers';
import { LAST_NAMES } from './lastNames';
import { COUNTRY, LOCATIONS } from './locations';
import { PLANS } from './plans';

const COUNT = 1000;

const customers = generateCustomers({ random: createRandom(5), count: COUNT });

describe('generateCustomers', () => {
  it('has the customer columns, in order', () => {
    expect(CUSTOMER_COLUMNS).toEqual([
      'customer_id',
      'first_name',
      'last_name',
      'email',
      'phone',
      'city',
      'state',
      'country',
      'signup_date',
      'plan',
      'monthly_spend',
    ]);
    expect(
      customers.every(
        (customer) => Object.keys(customer).join() === CUSTOMER_COLUMNS.join()
      )
    ).toBe(true);
  });

  it('generates the requested count', () => {
    expect(customers).toHaveLength(COUNT);
  });

  it('repeats for a seed and differs for another', () => {
    expect(
      generateCustomers({ random: createRandom(5), count: COUNT })
    ).toEqual(customers);
    expect(
      generateCustomers({ random: createRandom(6), count: COUNT })
    ).not.toEqual(customers);
  });

  describe('identity', () => {
    it('gives every customer an id, a full name, an email and a phone no other has', () => {
      expect(distinct(customers.map((customer) => customer.customer_id))).toBe(
        COUNT
      );
      expect(
        distinct(
          customers.map(
            (customer) => `${customer.first_name} ${customer.last_name}`
          )
        )
      ).toBe(COUNT);
      expect(distinct(customers.map((customer) => customer.email))).toBe(COUNT);
      expect(
        distinct(customers.map((customer) => customer.phone.replace(/\D/g, '')))
      ).toBe(COUNT);
    });

    it('numbers ids in order from C-10001', () => {
      expect(customers.at(0)?.customer_id).toBe('C-10001');
      expect(customers.at(-1)?.customer_id).toBe('C-11000');
    });

    it('draws names from the pools', () => {
      const firstNames = new Set<string>(FIRST_NAMES);
      const lastNames = new Set<string>(LAST_NAMES);

      expect(
        customers.every(
          (customer) =>
            firstNames.has(customer.first_name) &&
            lastNames.has(customer.last_name)
        )
      ).toBe(true);
    });
  });

  describe('contact details', () => {
    it('writes each email as first.last on a reserved domain, each covering a quarter or more', () => {
      const domains = customers.map((customer) =>
        customer.email.split('@').at(1)
      );

      expect(
        customers.every((customer) =>
          /^[a-z]+\.[a-z]+@example\.(com|org|net)$/.test(customer.email)
        )
      ).toBe(true);
      for (const domain of EMAIL_DOMAINS) {
        const share =
          domains.filter((candidate) => candidate === domain).length / COUNT;

        expect(share).toBeGreaterThan(0.25);
      }
    });

    it('keeps phones in the fictional 555-01xx range, in one layout', () => {
      expect(
        customers.every((customer) =>
          /^\(\d{3}\) 555-01\d{2}$/.test(customer.phone)
        )
      ).toBe(true);
    });
  });

  describe('places', () => {
    it('uses consistent city, state and country triples', () => {
      expect(
        customers.every((customer) =>
          LOCATIONS.some(
            (location) =>
              location.city === customer.city &&
              location.state === customer.state
          )
        )
      ).toBe(true);
      expect(customers.every((customer) => customer.country === COUNTRY)).toBe(
        true
      );
    });
  });

  describe('plans and spend', () => {
    it('uses every plan', () => {
      expect(distinct(customers.map((customer) => customer.plan))).toBe(
        PLANS.length
      );
    });

    it('writes spend with two decimals and no symbol or separator', () => {
      expect(
        customers.every((customer) =>
          /^\d+\.\d{2}$/.test(customer.monthly_spend)
        )
      ).toBe(true);
    });

    it('keeps spend inside the range of its plan, and Free at zero', () => {
      const outside = customers.filter((customer) => {
        const plan = PLANS.find(
          (candidate) => candidate.name === customer.plan
        );
        if (plan === undefined) return true;

        const cents = Math.round(Number(customer.monthly_spend) * 100);
        return (
          cents < plan.baseCents || cents > plan.baseCents + plan.maxUsageCents
        );
      });

      expect(outside).toEqual([]);
      expect(
        customers
          .filter((customer) => customer.plan === 'Free')
          .every((customer) => customer.monthly_spend === '0.00')
      ).toBe(true);
    });
  });

  describe('signup dates', () => {
    it('are real YYYY-MM-DD dates between 2022 and 2024', () => {
      const dates = customers.map((customer) => customer.signup_date);

      expect(
        dates.every((date) => parseDate(date)?.formats.join() === 'YYYY-MM-DD')
      ).toBe(true);
      expect(
        dates.every((date) => date >= '2022-01-01' && date <= '2024-12-31')
      ).toBe(true);
    });

    it('ascend with the ids', () => {
      const dates = customers.map((customer) => customer.signup_date);

      expect(dates).toEqual([...dates].sort());
    });
  });

  describe('spotless', () => {
    it.each(CUSTOMER_COLUMNS)(
      'has no blank, padded or placeholder %s cell',
      (column) => {
        const values = customers.map((customer) => customer[column]);

        expect(values.filter(isBlank)).toEqual([]);
        expect(
          values.filter((value) => normalizeWhitespace(value) !== value)
        ).toEqual([]);
        expect(
          values.filter((value) =>
            PLACEHOLDER_KEYS.includes(toComparisonKey(value))
          )
        ).toEqual([]);
      }
    );

    it.each(CUSTOMER_COLUMNS)('spells each %s value one way', (column) => {
      const values = customers.map((customer) => customer[column]);

      expect(distinct(values)).toBe(distinct(values.map(toComparisonKey)));
    });

    it('reads as one type per column', () => {
      expect(typesOf({ column: 'email' })).toEqual(['email']);
      expect(typesOf({ column: 'phone' })).toEqual(['phone']);
      expect(typesOf({ column: 'signup_date' })).toEqual(['date']);
      expect(typesOf({ column: 'monthly_spend' })).toEqual(['decimal']);
    });
  });
});

const PLACEHOLDER_KEYS = [
  'n/a',
  'na',
  'null',
  'none',
  'nil',
  '-',
  '--',
  '?',
  'unknown',
  'tbd',
  'missing',
];

function distinct(values: readonly string[]): number {
  return new Set(values).size;
}

function typesOf({ column }: { column: keyof Customer }): string[] {
  return [
    ...new Set(customers.map((customer) => detectValueType(customer[column]))),
  ];
}
