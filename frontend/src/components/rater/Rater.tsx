'use client';

/**
 * Rater — top-level interactive component for /tools/deal-rater.
 *
 * Owns:
 *   - input mode (paste / upload / structured)
 *   - worksheet text + structured-form fields
 *   - request lifecycle to POST /api/v1/rater/score
 *   - state-preview override that forces any of the 9 visible states
 *
 * The output panel renders <GradeCard/> with a CardState derived from
 * the response (or from the manual override).
 */

import { useEffect, useMemo, useRef, useState } from 'react';

import {
  type ConfidenceBand,
  type GradeLetter,
  type RaterResponse,
  type ProvinceCode,
  ApiError,
  scoreWorksheet,
} from '@/lib/api-client';

import { GradeCard, type CardState } from './GradeCard';
import { SAMPLES } from './samples';
import styles from './rater.module.css';


type InputMode    = 'paste' | 'upload' | 'structured';
type StateOverride =
  | 'auto'
  | 'empty'
  | 'loading'
  | 'A' | 'B' | 'C' | 'D' | 'F'
  | 'low_data'
  | 'error';

const STATE_OVERRIDES: StateOverride[] = [
  'auto', 'empty', 'loading',
  'A', 'B', 'C', 'D', 'F',
  'low_data', 'error',
];

const PROVINCES: ProvinceCode[] = [
  'AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT',
];


export function Rater(): JSX.Element {
  const [mode, setMode] = useState<InputMode>('paste');

  // Paste mode
  const [text, setText] = useState<string>(SAMPLES[0]?.text ?? '');
  const [activeSample, setActiveSample] = useState<string | null>(SAMPLES[0]?.id ?? null);

  // Structured mode
  const [form, setForm] = useState({
    vehicle:          '2026 BMW X3 xDrive30i',
    msrp:             '62400',
    freight_pdi:      '2480',
    cap_cost:         '58900',
    residual_percent: '0.59',
    rate_quoted_as:   'apr' as 'apr' | 'money_factor',
    rate_value:       '3.99',
    term_months:      39,
    annual_km:        16000,
    province_code:    'AB' as ProvinceCode,
  });

  // Lifecycle
  const [response, setResponse] = useState<RaterResponse | null>(null);
  const [loading,  setLoading]  = useState<boolean>(false);
  const [error,    setError]    = useState<string | null>(null);

  // State-preview override
  const [override, setOverride] = useState<StateOverride>('auto');

  const abortRef = useRef<AbortController | null>(null);

  // ── Submit ───────────────────────────────────────────────────────────
  async function submit(): Promise<void> {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const r = mode === 'structured'
        ? await scoreWorksheet({
            structured: {
              vehicle:          form.vehicle,
              msrp:             form.msrp,
              freight_pdi:      form.freight_pdi,
              cap_cost:         form.cap_cost,
              residual_percent: form.residual_percent,
              rate_quoted_as:   form.rate_quoted_as,
              rate_value:       form.rate_value,
              term_months:      form.term_months,
              annual_km:        form.annual_km,
              province_code:    form.province_code,
            },
          }, { signal: ctrl.signal })
        : await scoreWorksheet({ worksheet_text: text }, { signal: ctrl.signal });

      if (ctrl.signal.aborted) return;
      setResponse(r);
    } catch (e) {
      if (ctrl.signal.aborted) return;
      if (e instanceof ApiError) {
        const detail = (e.body as { error?: { message?: string } } | null)?.error?.message;
        setError(detail ?? `Backend returned ${e.status}`);
      } else if (e instanceof Error) {
        setError(e.message);
      } else {
        setError('Unknown error');
      }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }

  // Reset response when the user edits the textarea / switches mode.
  useEffect(() => {
    setResponse(null);
    setError(null);
  }, [mode]);

  // ── Detected state from real response ────────────────────────────────
  const detected: CardState = useMemo(() => {
    if (loading)  return { kind: 'loading' };
    if (error)    return { kind: 'error', message: error };
    if (!response) return { kind: 'empty' };
    if (response.confidence_band === 'insufficient_data') {
      return { kind: 'low_data', response };
    }
    if (response.grade) {
      return { kind: 'graded', response, letter: response.grade };
    }
    return { kind: 'low_data', response };
  }, [loading, error, response]);

  // ── Preview override ─────────────────────────────────────────────────
  const cardState: CardState = useMemo(() => {
    if (override === 'auto')     return detected;
    if (override === 'empty')    return { kind: 'empty' };
    if (override === 'loading')  return { kind: 'loading' };
    if (override === 'error')    return { kind: 'error', message: 'Sample error: backend unreachable.' };

    // Letter overrides + low_data need a synthetic response. Use the
    // current real response if available, otherwise a sample shape.
    const synthetic: RaterResponse = response ?? makeSyntheticPreview();
    if (override === 'low_data') {
      return {
        kind:     'low_data',
        response: { ...synthetic, confidence_band: 'insufficient_data' as ConfidenceBand, grade: synthetic.grade },
      };
    }
    return {
      kind:     'graded',
      response: {
        ...synthetic,
        grade:           override as GradeLetter,
        confidence_band: 'high' as ConfidenceBand,
        sample_size:     412,
        percentile:      override === 'A' ? 84 :
                         override === 'B' ? 61 :
                         override === 'C' ? 50 :
                         override === 'D' ? 14 :
                                            5,
      },
      letter: override as GradeLetter,
    };
  }, [override, detected, response]);

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className={styles.grid}>
      {/* INPUT */}
      <div>
        <div className={styles.tabs}>
          {(['paste', 'upload', 'structured'] as InputMode[]).map((m) => (
            <button
              key={m}
              type="button"
              className={mode === m ? `${styles.tab} ${styles.tabActive}` : styles.tab}
              onClick={() => setMode(m)}
            >
              {m === 'paste'       ? 'Paste worksheet' :
               m === 'upload'      ? 'Upload PDF' :
                                     'Type it out'}
            </button>
          ))}
        </div>

        {mode === 'paste' && (
          <div className={styles.pasteWrap}>
            <textarea
              className={styles.textarea}
              value={text}
              onChange={(e) => { setText(e.target.value); setActiveSample(null); setResponse(null); }}
              placeholder="Paste your dealer worksheet here. We extract the numbers automatically."
            />
            <div className={styles.actionsRow}>
              <div className={styles.sampleRow}>
                <span className={styles.sampleLabel}>Try:</span>
                {SAMPLES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={activeSample === s.id ? `${styles.pill} ${styles.pillActive}` : styles.pill}
                    onClick={() => { setText(s.text); setActiveSample(s.id); setResponse(null); }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className={styles.btn}
                onClick={() => { void submit(); }}
                disabled={loading || !text.trim()}
              >
                {loading ? 'Scoring…' : 'Rate this deal →'}
              </button>
            </div>
            <p className={styles.anonymityNote}>
              Anonymous · we strip dealer/customer names automatically before saving.
            </p>
            {response?.extracted && <ExtractedPanel response={response} />}
          </div>
        )}

        {mode === 'upload' && (
          <div className={styles.dropzone}>
            <div className={styles.dropzoneTitle}>PDF upload coming with Phase 1.4</div>
            <div className={styles.dropzoneCaption}>
              Server-side PDF text extraction lands alongside the MarketCheck
              integration. For now: open the PDF, copy the text, and paste it
              into the &ldquo;Paste worksheet&rdquo; tab.
            </div>
            <div className={styles.dropzonePending}>
              Tip: most dealers email a text PDF if you ask for &ldquo;the lease pencil.&rdquo;
            </div>
          </div>
        )}

        {mode === 'structured' && (
          <div className={styles.form}>
            <div className={styles.field}>
              <label htmlFor="vehicle">Vehicle</label>
              <input
                id="vehicle"
                className={styles.input}
                value={form.vehicle}
                onChange={(e) => setForm((f) => ({ ...f, vehicle: e.target.value }))}
              />
            </div>
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label>MSRP</label>
                <input
                  className={styles.input}
                  inputMode="decimal"
                  value={form.msrp}
                  onChange={(e) => setForm((f) => ({ ...f, msrp: e.target.value }))}
                />
              </div>
              <div className={styles.field}>
                <label>Freight & PDI</label>
                <input
                  className={styles.input}
                  inputMode="decimal"
                  value={form.freight_pdi}
                  onChange={(e) => setForm((f) => ({ ...f, freight_pdi: e.target.value }))}
                />
              </div>
            </div>
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label>Cap cost (selling price)</label>
                <input
                  className={styles.input}
                  inputMode="decimal"
                  value={form.cap_cost}
                  onChange={(e) => setForm((f) => ({ ...f, cap_cost: e.target.value }))}
                />
              </div>
              <div className={styles.field}>
                <label>Residual %</label>
                <input
                  className={styles.input}
                  inputMode="decimal"
                  value={form.residual_percent}
                  onChange={(e) => setForm((f) => ({ ...f, residual_percent: e.target.value }))}
                />
              </div>
            </div>
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label>Rate quoted as</label>
                <select
                  className={styles.input}
                  value={form.rate_quoted_as}
                  onChange={(e) => setForm((f) => ({ ...f, rate_quoted_as: e.target.value as 'apr' | 'money_factor' }))}
                >
                  <option value="apr">APR (Canadian)</option>
                  <option value="money_factor">Money factor</option>
                </select>
              </div>
              <div className={styles.field}>
                <label>{form.rate_quoted_as === 'apr' ? 'APR (%)' : 'Money factor'}</label>
                <input
                  className={styles.input}
                  inputMode="decimal"
                  value={form.rate_value}
                  onChange={(e) => setForm((f) => ({ ...f, rate_value: e.target.value }))}
                />
              </div>
            </div>
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label>Term (months)</label>
                <input
                  className={styles.input}
                  inputMode="numeric"
                  value={form.term_months}
                  onChange={(e) => setForm((f) => ({ ...f, term_months: Number(e.target.value) || 0 }))}
                />
              </div>
              <div className={styles.field}>
                <label>Annual km</label>
                <input
                  className={styles.input}
                  inputMode="numeric"
                  value={form.annual_km}
                  onChange={(e) => setForm((f) => ({ ...f, annual_km: Number(e.target.value) || 0 }))}
                />
              </div>
            </div>
            <div className={styles.field}>
              <label>Province</label>
              <select
                className={styles.input}
                value={form.province_code}
                onChange={(e) => setForm((f) => ({ ...f, province_code: e.target.value as ProvinceCode }))}
              >
                {PROVINCES.map((p) => (<option key={p} value={p}>{p}</option>))}
              </select>
            </div>
            <button
              type="button"
              className={styles.btn}
              onClick={() => { void submit(); }}
              disabled={loading}
            >
              {loading ? 'Scoring…' : 'Rate this deal →'}
            </button>
          </div>
        )}
      </div>

      {/* OUTPUT */}
      <div className={styles.outputCol}>
        <GradeCard state={cardState} />

        <div className={styles.statePreviewCard}>
          <span className="eyebrow">State preview</span>
          <div className={styles.statePills}>
            {STATE_OVERRIDES.map((s) => (
              <button
                key={s}
                type="button"
                className={override === s ? `${styles.statePill} ${styles.statePillActive}` : styles.statePill}
                onClick={() => setOverride(s)}
              >
                {s}
              </button>
            ))}
          </div>
          <div className={styles.statePreviewMeta}>
            Detected: {detected.kind === 'graded' ? detected.letter : detected.kind}
            {response?.confidence_band ? ` · ${response.confidence_band}` : ''}
          </div>
        </div>
      </div>
    </div>
  );
}


// ── Extracted-fields panel ──────────────────────────────────────────────

function ExtractedPanel({ response }: { response: RaterResponse }): JSX.Element {
  const e = response.extracted;
  // Display in the dealer's audit-trail convention: lead with whichever
  // (APR or MF) the worksheet quoted, conversion shown beneath.
  const ratePrimary  = e.rate_quoted_as === 'money_factor'
    ? { label: 'Money factor', value: e.money_factor ? Number(e.money_factor).toFixed(5) : '—' }
    : { label: 'APR',           value: e.apr ? `${Number(e.apr).toFixed(2)}%` : '—' };
  const rateSecondary = e.rate_quoted_as === 'money_factor'
    ? `= ${e.apr ? Number(e.apr).toFixed(2) + '%' : '—'} APR`
    : `= ${e.money_factor ? Number(e.money_factor).toFixed(5) : '—'} MF`;

  return (
    <div className={styles.extract}>
      <Row label="Vehicle"  value={e.vehicle ?? '—'} />
      <Row label="MSRP"     value={e.msrp ? `$${e.msrp}` : '—'} />
      <Row label="Selling"  value={e.cap_cost ? `$${e.cap_cost}` : '—'} />
      <Row label="Term"     value={e.term_months ? `${e.term_months} mo` : '—'} />
      <RowWithCaption
        label={ratePrimary.label}
        value={ratePrimary.value}
        caption={rateSecondary}
      />
      <Row label="Residual" value={e.residual_percent ? `${(Number(e.residual_percent) * 100).toFixed(0)}%` : '—'} />
      <Row label="Payment"  value={e.monthly_payment ? `$${e.monthly_payment}` : '—'} />
      <Row label="Province" value={e.province_code ?? '—'} />
      <Row label="Loyalty"  value={e.cash_incentives ? `$${e.cash_incentives}` : '—'} dim={!e.cash_incentives} />
    </div>
  );
}


function Row({ label, value, dim }: { label: string; value: string; dim?: boolean }): JSX.Element {
  return (
    <div className={dim ? `${styles.extractRow} ${styles.extractDim}` : styles.extractRow}>
      <span className={styles.extractLabel}>{label}</span>
      <span className={styles.extractValue}>{value}</span>
    </div>
  );
}


function RowWithCaption({
  label, value, caption,
}: {
  label:   string;
  value:   string;
  caption: string;
}): JSX.Element {
  return (
    <div className={styles.extractRow}>
      <span className={styles.extractLabel}>{label}</span>
      <span style={{ textAlign: 'right' }}>
        <span className={styles.extractValue}>{value}</span>
        <span className={styles.extractCaption}>{caption}</span>
      </span>
    </div>
  );
}


// ── Synthetic preview shape ─────────────────────────────────────────────
// Used by the state-preview pills when no real response exists yet, so a
// user clicking 'A' before submitting still sees the variant render.
function makeSyntheticPreview(): RaterResponse {
  return {
    extracted: {
      vehicle:          '2026 BMW X3 xDrive30i',
      make:             'BMW',
      model:            'X3',
      year:             2026,
      trim:             'xDrive30i',
      msrp:             '62400',
      freight_pdi:      '2480',
      cap_cost:         '58900',
      residual_percent: '0.59',
      rate_quoted_as:   'money_factor',
      apr:              '3.984',
      money_factor:     '0.00166',
      term_months:      39,
      annual_km:        16000,
      province_code:    'AB',
      monthly_payment:  '698',
      down_payment:     '0',
      trade_equity:     '0',
      cash_incentives:  '1500',
      acquisition_fee:  null,
      doc_fee:          null,
      addons_per_month: null,
      raw_text_excerpt: null,
      notes:            ['Synthetic preview — switch the State preview pill to "auto" to see real backend response.'],
    },
    grade:           'A',
    percentile:      84,
    sample_size:     412,
    confidence_band: 'high',
    markup: {
      captive_apr:             '3.99',
      quoted_apr:              '3.99',
      captive_mf:              '0.00166',
      quoted_mf:               '0.00166',
      markup_bps:              0,
      cost_per_month_estimate: null,
      cost_total_estimate:     null,
    },
    feedback: [
      { title: 'APR matches captive base', body: 'Sample preview only.', tone: 'good' },
      { title: 'Residual matches the published program', body: 'Sample preview only.', tone: 'good' },
      { title: 'Cap cost ~7% off MSRP+freight', body: 'Sample preview only.', tone: 'good' },
    ],
    notes: [],
    error: null,
  };
}
