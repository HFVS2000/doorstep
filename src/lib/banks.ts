// Sort code and account checking.
//
// This is a stand-in. In production, swap `validateBankDetails` for a call to a
// real bank-validation service (for example Loqate, Experian or your Direct Debit
// bureau's API), made from your server so the API key never reaches the tablet.

export type BankCheck =
  | { state: 'incomplete' }
  | { state: 'unknown-sort-code' }
  | { state: 'bank-found'; bank: string }
  | { state: 'bad-account'; bank: string }
  | { state: 'valid'; bank: string };

const PREFIXES: [string, string][] = [
  ['20', 'Barclays'], ['40', 'HSBC UK'], ['30', 'Lloyds Bank'], ['77', 'Lloyds Bank'],
  ['60', 'NatWest'], ['09', 'Santander UK'], ['07', 'Nationwide BS'], ['11', 'Halifax'],
  ['83', 'Royal Bank of Scotland'], ['23', 'Monzo'], ['04', 'Starling Bank'], ['08', 'The Co-operative Bank'],
];

export function lookupBank(sortDigits: string): string | null {
  if (sortDigits.length < 6 || sortDigits === '000000') return null;
  return PREFIXES.find(([p]) => sortDigits.startsWith(p))?.[1] ?? null;
}

export function validateBankDetails(sortDigits: string, account: string): BankCheck {
  if (sortDigits.length < 6) return { state: 'incomplete' };
  const bank = lookupBank(sortDigits);
  if (!bank) return { state: 'unknown-sort-code' };
  if (account.length < 8) return { state: 'bank-found', bank };
  if (/^(\d)\1{7}$/.test(account)) return { state: 'bad-account', bank };
  return { state: 'valid', bank };
}
