'use client';

/**
 * Calculator — top-level interactive component for /tools/calculator.
 *
 * Owns the form state, debounces input, calls the backend, derives the
 * appropriate output card state, and includes a state-preview switcher
 * so we can demo / visually verify all 7 OutputCard variants per the
 * Phase 1.2 exit criteria.
 *
 * Math lives entirely in the backend. This component handles state,
 * fetching, and — for the state preview — a manual override that forces
 * a particular variant regardless of the computed result.
 */

import { useEffect, useMemo, useRef, useState } from 'react';

import {
  type CalculatorRequest,
  type CalculatorResponse,
  type ProvinceCode,
  ApiError,
  computeLease,
} from '@/lib/api-client';
import { formatPercent } from '@/lib/format';

import { OutputCard, type CardState } from './OutputCard';
import inputStyles from './calculator.module.css';


// ── Constants ───────────────────────────────────────────────────────────

const PROVINCES: ProvinceCode[] = [
  'AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT',
];

const TERMS: number[] = [24, 27, 30, 36, 39, 48, 60];

type StateOverride = 'auto' | 'empty' | 'loading' | 'success' | 'warning' | 'bc_luxury' | 'error' | 'stale';

const STATE_OVERRIDES: StateOverride[] = [
  'auto', 'empty', 'loading', 'success', 'warning', 'bc_luxury', 'error', 'stale',
];

// Defaults that render the canonical fixture (BMW X3 / AB / 39mo / 3.99%)
// on first paint without requiring user input. Real Canadian numbers per
// CLAUDE.md "Real Canadian data, always."
const DEFAULTS = {
  msrp:             '62400',
  freight_pdi:      '2480',
  cap_cost:         '58900',
  residual_percent: '0.59',
  money_factor:     '0.00166',
  term_months:      39,
  annual_km:        16000,
  province_code:    'AB' as ProvinceCode,
  cash_incentives:  '1500',
  down_payment:     '0',
  trade_equity:     '0',
  acquisition_fee:  '675',
  provincial_fees:  '0',
};


// ── Component ───────────────────────────────────────────────────────────

export function Calculator(): JSX.Element {
  // Form state. Numeric inputs stay as strings until submit so partial
  // values like "" don't clamp prematurely.
  const [form, setForm] = useState({ ...DEFAULTS });

  const [response, setResponse] = useState<CalculatorResponse | null>(null);
  const [loading,  setLoading]  = useState<boolean>(false);
  const [error,    setError]    = useState<string | null>(null);

  const [override, setOverride] = useState<StateOverride>('auto');

  // Debounce calls — recompute 250ms after the user stops typing.
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isFormReady(form)) {
      setResponse(null);
      setError(null);
      setLoading(false);
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void run();
    }, 250);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    form.msrp, form.freight_pdi, form.cap_cost,
    form.residual_percent, form.money_factor,
    form.term_months, form.annual_km, form.province_code,
    form.cash_incentives, form.down_payment, form.trade_equity,
    form.acquisition_fee, form.provincial_fees,
  ]);

  async function run(): Promise<void> {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    setError(null);

    try {
      const req: CalculatorRequest = {
        msrp:             form.msrp,
        freight_pdi:      form.freight_pdi,
        cap_cost:         form.cap_cost,
        residual_percent: form.residual_percent,
        money_factor:     form.money_factor,
        term_months:      form.term_months,
        annual_km:        form.annual_km,
        province_code:    form.province_code,
        cash_incentives:  form.cash_incentives,
        down_payment:     form.down_payment,
        trade_equity:     form.trade_equity,
        acquisition_fee:  form.acquisition_fee,
        provincial_fees:  form.provincial_fees,
      };
      const r = await computeLease(req, { signal: ctrl.signal });
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
      setResponse(null);
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }

  // Derive the card state.
  const detected: CardState = useMemo(() => {
    if (!isFormReady(form)) return { kind: 'empty' };
    if (loading)            return { kind: 'loading' };
    if (error)              return { kind: 'error', message: error };
    if (!response)          return { kind: 'empty' };

    if (Number(response.bc_luxury_surtax) > 0) {
      return { kind: 'bc_luxury', response };
    }

    return {
      kind:         'success',
      response,
      province:     form.province_code,
      programLabel: 'Apr 2026 captive program',
    };
  }, [form, loading, error, response]);

  // Apply state preview override if not 'auto'. The overrides need a valid
  // response to render their non-empty variants — fall back to detected
  // when there's no response yet.
  const cardState: CardState = useMemo(() => {
    if (override === 'auto') return detected;
    if (override === 'empty')   return { kind: 'empty' };
    if (override === 'loading') return { kind: 'loading' };
    if (override === 'error')   return { kind: 'error', message: 'Sample error: backend unreachable.' };
    if (!response) return detected;
    if (override === 'success')   return { kind: 'success',   response, province: form.province_code, programLabel: 'Apr 2026 captive program' };
    if (override === 'warning')   return { kind: 'warning',   response, province: form.province_code, mfMarkup: '0.00084' };
    if (override === 'bc_luxury') return { kind: 'bc_luxury', response };
    if (override === 'stale')     return { kind: 'stale',     response, province: form.province_code, programLabel: 'Mar 2026 program' };
    return detected;
  }, [override, detected, response, form.province_code]);

  const update = <K extends keyof typeof DEFAULTS>(k: K, v: (typeof DEFAULTS)[K]): void =>
    setForm((f) => ({ ...f, [k]: v }));


  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className={inputStyles.grid}>
      {/* INPUTS */}
      <div>
        <Group num={1} title="Vehicle">
          <FieldRow>
            <Field label="MSRP">
              <CurrencyInput value={form.msrp}        onChange={(v) => update('msrp', v)} />
            </Field>
            <Field label="Freight & PDI">
              <CurrencyInput value={form.freight_pdi} onChange={(v) => update('freight_pdi', v)} />
            </Field>
          </FieldRow>
        </Group>

        <Group num={2} title="Lease structure">
          <FieldRow>
            <Field label="Cap cost (selling price)">
              <CurrencyInput value={form.cap_cost} onChange={(v) => update('cap_cost', v)} />
            </Field>
            <Field
              label="Residual %"
              hint={
                <>
                  Decimal: <span className="mono">{formatPercent(form.residual_percent)}</span>
                </>
              }
            >
              <NumericInput value={form.residual_percent} onChange={(v) => update('residual_percent', v)} />
            </Field>
          </FieldRow>
          <FieldRow>
            <Field
              label="Money factor"
              hint={
                <>
                  APR: <span className="mono">{(Number(form.money_factor) * 2400).toFixed(2)}%</span>
                </>
              }
            >
              <NumericInput value={form.money_factor} onChange={(v) => update('money_factor', v)} />
            </Field>
            <Field label="Term (months)">
              <select
                className={inputStyles.input}
                value={form.term_months}
                onChange={(e) => update('term_months', Number(e.target.value))}
              >
                {TERMS.map((t) => (
                  <option key={t} value={t}>{t} mo</option>
                ))}
              </select>
            </Field>
          </FieldRow>
          <Field label="Annual kilometres">
            <NumericInput value={String(form.annual_km)} onChange={(v) => update('annual_km', Number(v) || 0)} />
          </Field>
        </Group>

        <Group num={3} title="Cash position">
          <FieldRow>
            <Field label="Cash incentives">
              <CurrencyInput value={form.cash_incentives} onChange={(v) => update('cash_incentives', v)} />
            </Field>
            <Field label="Down payment">
              <CurrencyInput value={form.down_payment} onChange={(v) => update('down_payment', v)} />
            </Field>
          </FieldRow>
          <FieldRow>
            <Field label="Trade equity">
              <CurrencyInput value={form.trade_equity} onChange={(v) => update('trade_equity', v)} />
            </Field>
            <Field label="Acquisition fee">
              <CurrencyInput value={form.acquisition_fee} onChange={(v) => update('acquisition_fee', v)} />
            </Field>
          </FieldRow>
        </Group>

        <Group num={4} title="Province">
          <Field label="Province">
            <div className={inputStyles.provGrid}>
              {PROVINCES.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={
                    p === form.province_code
                      ? `${inputStyles.provBtn} ${inputStyles.provBtnActive}`
                      : inputStyles.provBtn
                  }
                  onClick={() => update('province_code', p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </Field>
        </Group>
      </div>

      {/* OUTPUT */}
      <div className={inputStyles.outputCol}>
        <OutputCard state={cardState} />

        <div className={inputStyles.statePreviewCard}>
          <span className="eyebrow">State preview</span>
          <div className={inputStyles.statePills}>
            {STATE_OVERRIDES.map((s) => (
              <button
                key={s}
                type="button"
                className={
                  override === s
                    ? `${inputStyles.statePill} ${inputStyles.statePillActive}`
                    : inputStyles.statePill
                }
                onClick={() => setOverride(s)}
              >
                {s}
              </button>
            ))}
          </div>
          <div className={inputStyles.statePreviewMeta}>
            Detected: {detected.kind}
            {form.province_code === 'BC' && Number(form.msrp) > 124999
              ? ' · BC luxury'
              : ''}
          </div>
        </div>
      </div>
    </div>
  );
}


// ── Small presentational helpers ────────────────────────────────────────

function Group({
  num, title, children,
}: {
  num:      number;
  title:    string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className={inputStyles.group}>
      <div className={inputStyles.groupHead}>
        <span style={{ display: 'flex', alignItems: 'center' }}>
          <span className={inputStyles.groupNum}>0{num}</span>
          <span>{title}</span>
        </span>
      </div>
      <div className={inputStyles.groupBody}>{children}</div>
    </div>
  );
}


function FieldRow({ children }: { children: React.ReactNode }): JSX.Element {
  return <div className={inputStyles.fieldRow}>{children}</div>;
}


function Field({
  label, hint, children,
}: {
  label:     string;
  hint?:     React.ReactNode;
  children:  React.ReactNode;
}): JSX.Element {
  return (
    <div className={inputStyles.field}>
      <label>{label}</label>
      {children}
      {hint && <div className={inputStyles.fieldHint}>{hint}</div>}
    </div>
  );
}


function CurrencyInput({
  value, onChange,
}: {
  value:    string;
  onChange: (v: string) => void;
}): JSX.Element {
  return (
    <div className={inputStyles.affix}>
      <span>$</span>
      <input
        type="text"
        inputMode="decimal"
        className={inputStyles.input}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}


function NumericInput({
  value, onChange,
}: {
  value:    string;
  onChange: (v: string) => void;
}): JSX.Element {
  return (
    <input
      type="text"
      inputMode="decimal"
      className={inputStyles.input}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}


// ── Validation gate ─────────────────────────────────────────────────────

function isFormReady(form: typeof DEFAULTS): boolean {
  // The backend rejects negative or zero values for these — gate the
  // request rather than letting the user see a 422 on every keystroke.
  const numeric = (s: string): number => {
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
  };

  return (
    numeric(form.msrp)             > 0 &&
    numeric(form.freight_pdi)      >= 0 &&
    numeric(form.cap_cost)         > 0 &&
    numeric(form.residual_percent) > 0 &&
    numeric(form.residual_percent) < 1 &&
    numeric(form.money_factor)     >= 0 &&
    form.term_months               > 0 &&
    form.annual_km                 > 0 &&
    PROVINCES.includes(form.province_code)
  );
}
