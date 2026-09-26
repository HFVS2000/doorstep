// Checks for supporter details on the sign-up form.

/** Age in whole years on `today`, or null if the date isn't a real date. */
export function ageFrom(dd: string, mm: string, yyyy: string, today = new Date()): number | null {
  const d = +dd, m = +mm, y = +yyyy;
  if (!d || !m || yyyy.length !== 4 || m > 12 || d > 31) return null;
  const dob = new Date(y, m - 1, d);
  if (dob.getMonth() !== m - 1) return null; // e.g. 31 February
  if (dob > today) return null;
  let age = today.getFullYear() - y;
  const md = today.getMonth() - (m - 1);
  if (md < 0 || (md === 0 && today.getDate() < d)) age--;
  return age;
}

/** UK mobile, written as 07…, +447… or 00447…, with or without spaces and dashes. */
export function isUkMobile(raw: string): boolean {
  const n = raw.replace(/[\s\-().]/g, '').replace(/^(\+44|0044)/, '0');
  return /^07\d{9}$/.test(n);
}

export function isEmail(raw: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(raw.trim());
}
