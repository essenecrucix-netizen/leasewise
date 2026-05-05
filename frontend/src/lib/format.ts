/**
 * Display formatters — currency, percent, money factor.
 *
 * Formatting only. NEVER do arithmetic here. The backend computes; this
 * module just presents the result. CLAUDE.md "always" rule #1.
 *
 * Decimal values arrive from the backend as strings. Parse to Number at
 * the boundary; that's safe because we're only formatting for display
 * and any precision loss past two decimals doesn't affect the rendered
 * string.
 */

const CAD = new Intl.NumberFormat('en-CA', {
  style:                 'currency',
  currency:              'CAD',
  currencyDisplay:       'symbol',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const CAD_INTEGER = new Intl.NumberFormat('en-CA', {
  style:                 'currency',
  currency:              'CAD',
  currencyDisplay:       'symbol',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});


/** "$700.91" — two decimals, CAD symbol. Use for monthly payments and tax lines. */
export function formatCurrency(value: string | number): string {
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n)) return '—';
  return CAD.format(n);
}


/** "$700" — no decimals. Use for headline totals where cents are noise. */
export function formatCurrencyRound(value: string | number): string {
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n)) return '—';
  return CAD_INTEGER.format(n);
}


/**
 * "5.61%" from a decimal like "0.0561".
 * digits defaults to 2; pass 0 for "5%" or 3 for "5.610%".
 */
export function formatPercent(value: string | number, digits = 2): string {
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n)) return '—';
  return `${(n * 100).toFixed(digits)}%`;
}


/** "0.00166" — fixed five decimals, the conventional MF display. */
export function formatMoneyFactor(value: string | number): string {
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n)) return '—';
  return n.toFixed(5);
}


/** "3.984%" — APR returned by the backend as already-multiplied (3.984, not 0.03984). */
export function formatAprFromBackend(value: string | number, digits = 3): string {
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n)) return '—';
  return `${n.toFixed(digits)}%`;
}
