import { describe, expect, it } from 'vitest';
import { ageFrom, isEmail, isUkMobile } from '../../src/lib/validate';

const today = new Date(2026, 8, 26); // 26 Sep 2026

describe('ageFrom', () => {
  it('works out age in whole years', () => {
    expect(ageFrom('14', '03', '1981', today)).toBe(45);
  });
  it('turns 18 exactly on the birthday, not the day before', () => {
    expect(ageFrom('26', '09', '2008', today)).toBe(18);
    expect(ageFrom('27', '09', '2008', today)).toBe(17);
  });
  it('rejects impossible or incomplete dates', () => {
    expect(ageFrom('31', '02', '1990', today)).toBeNull();
    expect(ageFrom('10', '13', '1990', today)).toBeNull();
    expect(ageFrom('10', '05', '90', today)).toBeNull();
    expect(ageFrom('', '05', '1990', today)).toBeNull();
  });
  it('rejects dates in the future', () => {
    expect(ageFrom('01', '01', '2030', today)).toBeNull();
  });
  it('handles 29 February', () => {
    expect(ageFrom('29', '02', '2000', today)).toBe(26);
    expect(ageFrom('29', '02', '2001', today)).toBeNull();
  });
});

describe('isUkMobile', () => {
  it.each(['07700900412', '07700 900 412', '+44 7700 900412', '00447700900412', '07700-900-412'])('accepts %s', (n) => {
    expect(isUkMobile(n)).toBe(true);
  });
  it.each(['01245 123456', '0770090041', '077009004123', '+33 6 12 34 56 78', ''])('rejects %s', (n) => {
    expect(isUkMobile(n)).toBe(false);
  });
});

describe('isEmail', () => {
  it('accepts normal addresses', () => {
    expect(isEmail('sarah.collins@example.co.uk')).toBe(true);
    expect(isEmail(' sarah@example.com ')).toBe(true);
  });
  it('rejects broken ones', () => {
    expect(isEmail('sarah@example')).toBe(false);
    expect(isEmail('sarah example.com')).toBe(false);
    expect(isEmail('sarah@.c')).toBe(false);
  });
});
