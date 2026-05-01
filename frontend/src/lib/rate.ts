/**
 * Lease rate unit conversions (APR ↔ money factor).
 *
 * This is a unit conversion, not lease math — APR and money factor are
 * the same number expressed in different units (APR% = MF × 2400). The
 * backend's app/lease_math/conversion.py is the canonical implementation;
 * these TS helpers exist only so the calculator UI can lead with APR
 * (the Canadian convention) while still posting `money_factor` to the
 * unchanged backend `/api/v1/calculator/compute` contract.
 *
 * Don't add lease arithmetic here. CLAUDE.md "always" rule #1: all lease
 * math lives in the backend. ÷2400 is allowed only because it's a unit
 * conversion equivalent to "convert metres to feet" — no business logic.
 */


/** Realistic Canadian APR range. Inputs outside are likely typos. */
export const APR_MIN = 0.99;
export const APR_MAX = 12.0;


/** APR percent (e.g., 3.99) → money factor (e.g., 0.001662). */
export function aprToMoneyFactor(aprPercent: number): number {
  return aprPercent / 2400;
}


/** Money factor (e.g., 0.00166) → APR percent (e.g., 3.984). */
export function moneyFactorToApr(moneyFactor: number): number {
  return moneyFactor * 2400;
}


/**
 * Parse an APR string (from a form input) to a number, or NaN if not
 * parseable. Does not enforce the validity range — call isAprValid for
 * that.
 */
export function parseApr(raw: string): number {
  const trimmed = raw.trim();
  if (!trimmed) return NaN;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : NaN;
}


/** True if the APR is finite and within the realistic Canadian range. */
export function isAprValid(apr: number): boolean {
  return Number.isFinite(apr) && apr >= APR_MIN && apr <= APR_MAX;
}


/**
 * Convert an APR string from the form to a money_factor string suitable
 * for posting to the backend. Returns null if the input is not parseable.
 *
 * Use full Number precision — the backend takes Decimal, and converting
 * via toString() preserves whatever precision the user typed (e.g. APR
 * "3.99" → "0.0016625"; APR "3.984" → "0.00166").
 */
export function aprStringToMoneyFactorString(apr: string): string | null {
  const n = parseApr(apr);
  if (!Number.isFinite(n)) return null;
  return aprToMoneyFactor(n).toString();
}
