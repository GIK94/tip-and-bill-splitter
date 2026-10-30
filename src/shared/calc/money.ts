/** Money helpers. All amounts are integer cents (USD); percentages are basis points (1% = 100). */

const MONEY_RE = /^(\d{1,7})(?:\.(\d{0,2}))?$/;
const MONEY_FRACTION_ONLY_RE = /^\.(\d{1,2})$/;
const PERCENT_RE = /^(\d{1,3})(?:\.(\d{0,2}))?$/;

/**
 * Parses a user-typed dollar amount ("12", "12.5", "$1,234.56", ".99") into cents.
 * Returns null when the text is not a valid non-negative amount with at most 2 decimals.
 * Parsing is done on the string, so no floating-point error can creep in.
 */
export function parseMoneyToCents(raw: string): number | null {
  const s = raw.trim().replace(/^\$/, '').replace(/,/g, '');
  let match = MONEY_RE.exec(s);
  if (match) {
    const dollars = Number(match[1]);
    const cents = Number((match[2] ?? '').padEnd(2, '0'));
    return dollars * 100 + cents;
  }
  match = MONEY_FRACTION_ONLY_RE.exec(s);
  if (match) return Number(match[1].padEnd(2, '0'));
  return null;
}

/** Parses "18", "12.5", "12.75%" into basis points. Returns null if invalid. */
export function parsePercentToBasisPoints(raw: string): number | null {
  const match = PERCENT_RE.exec(raw.trim().replace(/%$/, '').trim());
  if (!match) return null;
  return Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
}

/** 123456 -> "$1,234.56"; -300 -> "-$3.00". */
export function formatCents(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100).toLocaleString('en-US');
  return `${sign}$${dollars}.${String(abs % 100).padStart(2, '0')}`;
}

/** 123456 -> "1234.56" (for pre-filling inputs). */
export function centsToInput(cents: number): string {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
}

/** 1800 -> "18%", 1250 -> "12.5%", 1275 -> "12.75%". */
export function formatBasisPoints(bp: number): string {
  const whole = Math.floor(bp / 100);
  const frac = bp % 100;
  if (frac === 0) return `${whole}%`;
  return `${whole}.${String(frac).padStart(2, '0').replace(/0$/, '')}%`;
}

/** 1250 -> "12.5" (for pre-filling inputs). */
export function basisPointsToInput(bp: number): string {
  return formatBasisPoints(bp).replace('%', '');
}
