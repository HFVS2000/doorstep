import { describe, expect, it } from 'vitest';
import { lookupBank, validateBankDetails } from '../../src/lib/banks';

describe('lookupBank', () => {
  it('finds the bank from the sort code', () => {
    expect(lookupBank('204577')).toBe('Barclays');
    expect(lookupBank('401234')).toBe('HSBC UK');
  });
  it('needs all six digits', () => {
    expect(lookupBank('2045')).toBeNull();
  });
  it('returns null for unknown sort codes', () => {
    expect(lookupBank('999999')).toBeNull();
    expect(lookupBank('000000')).toBeNull();
  });
});

describe('validateBankDetails', () => {
  it('walks through the states as digits are typed', () => {
    expect(validateBankDetails('20', '')).toEqual({ state: 'incomplete' });
    expect(validateBankDetails('204577', '4371')).toEqual({ state: 'bank-found', bank: 'Barclays' });
    expect(validateBankDetails('204577', '43718265')).toEqual({ state: 'valid', bank: 'Barclays' });
  });
  it('flags unknown sort codes and obviously fake account numbers', () => {
    expect(validateBankDetails('999999', '43718265')).toEqual({ state: 'unknown-sort-code' });
    expect(validateBankDetails('204577', '11111111')).toEqual({ state: 'bad-account', bank: 'Barclays' });
  });
});
