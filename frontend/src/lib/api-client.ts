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


// ── Deal rater ──────────────────────────────────────────────────────────

export type RateQuotedAs = 'apr' | 'money_factor';

export interface ExtractedFields {
  vehicle:           string | null;
  make:              string | null;
  model:             string | null;
  year:              number | null;
  trim:              string | null;
  msrp:              string | null;       // Decimals as JSON strings
  freight_pdi:       string | null;
  cap_cost:          string | null;
  residual_percent:  string | null;
  rate_quoted_as:    RateQuotedAs | null;
  apr:               string | null;
  money_factor:      string | null;
  term_months:       number | null;
  annual_km:         number | null;
  province_code:     string | null;
  monthly_payment:   string | null;
  down_payment:      string | null;
  trade_equity:      string | null;
  cash_incentives:   string | null;
  acquisition_fee:   string | null;
  doc_fee:           string | null;
  addons_per_month:  string | null;
  raw_text_excerpt:  string | null;
  notes:             string[];
}

export interface MarkupAnalysis {
  captive_apr:             string;
  quoted_apr:              string;
  captive_mf:              string;
  quoted_mf:               string;
  markup_bps:              number;
  cost_per_month_estimate: string | null;
  cost_total_estimate:     string | null;
}

export type FeedbackTone = 'good' | 'warn' | 'bad';

export interface FeedbackItem {
  title: string;
  body:  string;
  tone:  FeedbackTone;
}

export type GradeLetter    = 'A' | 'B' | 'C' | 'D' | 'F';
export type ConfidenceBand = 'high' | 'medium' | 'low' | 'insufficient_data';

export interface RaterResponse {
  extracted:        ExtractedFields;
  grade:            GradeLetter | null;
  percentile:       number | null;
  sample_size:      number;
  confidence_band:  ConfidenceBand;
  markup:           MarkupAnalysis | null;
  feedback:         FeedbackItem[];
  notes:            string[];
  error:            string | null;
}

export interface StructuredInput {
  vehicle?:          string;
  msrp?:             string;
  freight_pdi?:      string;
  cap_cost?:         string;
  residual_percent?: string;
  rate_quoted_as?:   RateQuotedAs;
  rate_value?:       string;
  term_months?:      number;
  annual_km?:        number;
  province_code?:    string;
  monthly_payment?:  string;
  down_payment?:     string;
  trade_equity?:     string;
  cash_incentives?:  string;
  acquisition_fee?:  string;
  doc_fee?:          string;
}

export interface RaterRequest {
  worksheet_text?: string;
  structured?:     StructuredInput;
}

export async function scoreWorksheet(
  req: RaterRequest,
  init?: { signal?: AbortSignal },
): Promise<RaterResponse> {
  const resp = await fetch(`${API_BASE}/api/v1/rater/score`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(req),
    signal:  init?.signal,
  });

  if (!resp.ok) {
    let body: unknown = null;
    try { body = await resp.json(); } catch { /* ignore */ }
    throw new ApiError(resp.status, body, `score_worksheet failed: ${resp.status}`);
  }

  return (await resp.json()) as RaterResponse;
}


// ── Sources ─────────────────────────────────────────────────────────────

export type SourceConfidence = 'high' | 'medium' | 'low';

export interface Source {
  name:             string;
  coverage:         string;
  method:           string;
  last_sync:        string | null;       // ISO timestamp
  last_sync_human:  string | null;
  confidence:       SourceConfidence;
}

export interface SourcesResponse {
  sources: Source[];
  summary: Record<string, string | number>;
}

export async function getSources(): Promise<SourcesResponse> {
  const resp = await fetch(`${API_BASE}/api/v1/sources`, { cache: 'no-store' });
  if (!resp.ok) {
    throw new ApiError(resp.status, null, `getSources failed: ${resp.status}`);
  }
  return (await resp.json()) as SourcesResponse;
}
