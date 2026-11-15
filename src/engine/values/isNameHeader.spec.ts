import { describe, expect, it } from 'vitest';
import { isNameHeader } from './isNameHeader';

describe('isNameHeader', () => {
  it.each([
    'name',
    'Name',
    'first_name',
    'last_name',
    'First Name',
    'firstName',
    'FirstName',
    'FULL NAME',
    'fullname',
    'surname',
    'customer_name',
    'Contact Name',
    'fname',
    'LNAME',
  ])('is true for %j', (header) => {
    expect(isNameHeader(header)).toBe(true);
  });

  it.each([
    'state_name',
    'plan_name',
    'city',
    'email',
    'first_seen',
    'last_login',
    'username_count',
    'nickname',
    'filename',
    '',
  ])('is false for %j', (header) => {
    expect(isNameHeader(header)).toBe(false);
  });
});
