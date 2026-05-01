/**
 * Typed API client for the LeaseWise FastAPI backend.
 *
 * All backend calls go through this module. Request/response shapes mirror
 * the Pydantic models in backend/app/api/v1/. When the backend adds or
 * changes endpoints, update the shapes here in lockstep.
 *
 * Decimal values arrive over the wire as JSON strings (Pydantic's default
 * Decimal serialization). Leave them as strings here and parse to Number
 * only at formatting time in lib/format.ts — frontend never does arithmetic
 * on these, so there's no need for a big-decimal library.
 */

const API_BASE: string =
  process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8000';


export class ApiError extends Error {
  constructor(public status: number, public body: unknown, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}


/** Province codes accepted by the calculator (matches tax.py keys). */
export type ProvinceCode =
  | 'AB' | 'BC' | 'MB' | 'NB' | 'NL' | 'NS'
  | 'NT' | 'NU' | 'ON' | 'PE' | 'QC' | 'SK' | 'YT';


export interface CalculatorRequest {
  msrp:               string;        // Decimal as string
  freight_pdi:        string;
  cap_cost:           string;
  residual_percent:   string;        // 0.59 for 59%
  money_factor:       string;
  term_months:        number;
  annual_km:          number;
  province_code:      ProvinceCode;
  down_payment?:      string;
  trade_equity?:      string;
  cash_incentives?:   string;
  acquisition_fee?:   string;
  provincial_fees?:   string;
}


export interface CalculatorResponse {
  monthly_total:          string;
  monthly_pre_tax:        string;
  monthly_tax:            string;
  monthly_depreciation:   string;
  monthly_finance:        string;
  drive_off:              string;
  total_cost_of_lease:    string;
  residual_amount:        string;
  adjusted_cap_cost:      string;
  effective_discount_pct: string;
  payment_to_msrp_ratio:  string;
  apr_equivalent:         string;
  bc_luxury_surtax:       string;
  qc_tax_split:           { gst: string; qst: string } | null;
}


export async function computeLease(
  req: CalculatorRequest,
  init?: { signal?: AbortSignal },
): Promise<CalculatorResponse> {
  const resp = await fetch(`${API_BASE}/api/v1/calculator/compute`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(req),
    signal:  init?.signal,
  });

  if (!resp.ok) {
    let body: unknown = null;
    try { body = await resp.json(); } catch { /* ignore */ }
    throw new ApiError(resp.status, body, `compute_lease failed: ${resp.status}`);
  }

  return (await resp.json()) as CalculatorResponse;
}


/** Health probe — used by smoke tests and the bootstrap script. */
export async function healthCheck(): Promise<{ status: string }> {
  const resp = await fetch(`${API_BASE}/health`);
  if (!resp.ok) {
    throw new ApiError(resp.status, null, `/health returned ${resp.status}`);
  }
  return (await resp.json()) as { status: string };
}
