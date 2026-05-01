/**
 * OutputCard — the polished output card (.coc), seven states.
 *
 * Pure presentation. Receives a CardState discriminated union and renders
 * the matching variant. No fetching, no form state, no math beyond
 * formatting — anything numeric comes from the backend response and goes
 * through lib/format.ts.
 */

import type { CalculatorResponse, ProvinceCode } from '@/lib/api-client';
import {
  formatCurrency,
  formatCurrencyRound,
  formatMoneyFactor,
  formatPercent,
} from '@/lib/format';

import styles from './coc.module.css';


// ── State discriminated union ───────────────────────────────────────────
//
// Warning carries APR-denominated markup data. Canadian dealer worksheets
// quote APR; presenting markup in APR / bps is the canonical Canadian
// framing. Money factor is shown as a secondary disclosure below.
export type CardState =
  | { kind: 'empty' }
  | { kind: 'loading' }
  | { kind: 'error';     message: string }
  | { kind: 'stale';     response: CalculatorResponse; province: ProvinceCode; programLabel: string }
  | { kind: 'bc_luxury'; response: CalculatorResponse }
  | { kind: 'warning';   response: CalculatorResponse; province: ProvinceCode; captiveApr: string; quotedApr: string }
  | { kind: 'success';   response: CalculatorResponse; province: ProvinceCode; programLabel: string };


// ── Top-level dispatch ──────────────────────────────────────────────────
export function OutputCard(props: { state: CardState }): JSX.Element {
  switch (props.state.kind) {
    case 'empty':     return <Empty />;
    case 'loading':   return <Loading />;
    case 'error':     return <ErrorState message={props.state.message} />;
    case 'stale':     return <Stale     {...props.state} />;
    case 'bc_luxury': return <BcLuxury  response={props.state.response} />;
    case 'warning':   return <Warning   {...props.state} />;
    case 'success':   return <Success   {...props.state} />;
  }
}


// ── Variants ────────────────────────────────────────────────────────────

function Empty(): JSX.Element {
  return (
    <div className={styles.coc} aria-live="polite">
      <div className={styles.eyebrow}>
        <span>Estimated payment</span>
      </div>
      <div className={styles.empty}>
        <div className={styles.emptyTitle}>Enter your lease inputs</div>
        <p className={styles.emptyHint}>
          MSRP, cap cost, money factor, residual, and term — we&rsquo;ll show
          your monthly payment with provincial tax applied correctly.
        </p>
      </div>
    </div>
  );
}


function Loading(): JSX.Element {
  return (
    <div className={styles.coc} aria-live="polite" aria-busy="true">
      <div className={styles.eyebrow}>
        <span>Estimated payment</span>
        <span>● calculating</span>
      </div>
      <div className={`${styles.skel} ${styles.skelBig}`} />
      <div className={`${styles.skel} ${styles.skelLine}`} />
      <div className={`${styles.skel} ${styles.skelLine2}`} />
      <div className={`${styles.skel} ${styles.skelLine2}`} />
    </div>
  );
}


function ErrorState({ message }: { message: string }): JSX.Element {
  return (
    <div className={styles.coc} aria-live="polite">
      <div className={styles.eyebrow}>
        <span className={styles.eyebrowDotOrange}>● calculation failed</span>
      </div>
      <div className={`${styles.pay} ${styles.payMuted}`}>
        $ —<sub>/mo</sub>
      </div>
      <div className={styles.flag}>
        <div>
          <strong>We couldn&rsquo;t compute that</strong>
          {message}
        </div>
      </div>
    </div>
  );
}


function Success({
  response,
  province,
  programLabel,
}: {
  response:     CalculatorResponse;
  province:     ProvinceCode;
  programLabel: string;
}): JSX.Element {
  return (
    <div className={styles.coc} aria-live="polite">
      <div className={styles.eyebrow}>
        <span>Estimated payment</span>
        <span className={styles.eyebrowDot}>● live · {programLabel}</span>
      </div>
      <div className={styles.pay}>
        {formatCurrencyRound(response.monthly_total)}
        <sub>/mo · taxed in {province}</sub>
      </div>
      <Breakdown response={response} />
    </div>
  );
}


function Warning({
  response,
  province,
  captiveApr,
  quotedApr,
}: {
  response:   CalculatorResponse;
  province:   ProvinceCode;
  captiveApr: string;
  quotedApr:  string;
}): JSX.Element {
  // Canadian framing: APR primary, money factor disclosed as the dealer's
  // internal pricing convention. Both numbers are computed display-side
  // from the captive vs quoted APRs — pure unit conversion, not lease math.
  const cap = Number(captiveApr);
  const quo = Number(quotedApr);
  const bps = Number.isFinite(cap) && Number.isFinite(quo) ? Math.round((quo - cap) * 100) : 0;
  const captiveMf = Number.isFinite(cap) ? (cap / 2400).toFixed(5) : '—';
  const quotedMf  = Number.isFinite(quo) ? (quo / 2400).toFixed(5) : '—';

  return (
    <div className={styles.coc} aria-live="polite">
      <div className={styles.eyebrow}>
        <span>Estimated payment</span>
        <span className={styles.eyebrowDotAmber}>⚠ markup detected</span>
      </div>
      <div className={`${styles.pay} ${styles.payWarn}`}>
        {formatCurrencyRound(response.monthly_total)}
        <sub>/mo · taxed in {province}</sub>
      </div>
      <div className={`${styles.flag} ${styles.flagAmber}`}>
        <div>
          <strong>APR marked up ~{bps} bps</strong>
          Captive base is <span className="mono">{cap.toFixed(2)}%</span>; dealer
          quoted <span className="mono">{quo.toFixed(2)}%</span>. That difference
          shows up every month for the term.
          <div style={{ marginTop: 4, fontSize: 11, color: 'var(--text-muted)' }}>
            Money factor: <span className="mono">{captiveMf}</span> →{' '}
            <span className="mono">{quotedMf}</span> · ~92% of dealers mark this up.
          </div>
        </div>
      </div>
      <Breakdown response={response} />
    </div>
  );
}


function BcLuxury({ response }: { response: CalculatorResponse }): JSX.Element {
  return (
    <div className={styles.coc} aria-live="polite">
      <div className={styles.eyebrow}>
        <span>Estimated payment</span>
        <span className={styles.eyebrowDotOrange}>● BC luxury surtax</span>
      </div>
      <div className={styles.pay}>
        {formatCurrencyRound(response.monthly_total)}
        <sub>/mo · BC</sub>
      </div>
      <div className={styles.flag}>
        <div>
          <strong>BC luxury surtax applies</strong>
          Vehicle price exceeds the $124,999 threshold. Additional surtax is
          included in the monthly tax line below
          (<span className="mono">{formatCurrency(response.bc_luxury_surtax)}</span> /mo).
        </div>
      </div>
      <Breakdown response={response} />
    </div>
  );
}


function Stale({
  response,
  province,
  programLabel,
}: {
  response:     CalculatorResponse;
  province:     ProvinceCode;
  programLabel: string;
}): JSX.Element {
  return (
    <div className={`${styles.coc} ${styles.opaqueStale}`} aria-live="polite">
      <div className={styles.eyebrow}>
        <span>Last-known payment</span>
        <span className={styles.eyebrowDotAmber}>⏱ {programLabel} · expired</span>
      </div>
      <div className={`${styles.pay} ${styles.payMuted}`}>
        {formatCurrencyRound(response.monthly_total)}
        <sub>/mo · taxed in {province}</sub>
      </div>
      <div className={`${styles.flag} ${styles.flagAmber}`}>
        <div>
          <strong>Program expired</strong>
          The captive lender hasn&rsquo;t published a new program for this
          vehicle yet. The numbers below reflect the most recent published
          program. We auto-refresh within 24h of release.
        </div>
      </div>
      <Breakdown response={response} />
    </div>
  );
}


// ── Shared breakdown rows ──────────────────────────────────────────────
function Breakdown({ response }: { response: CalculatorResponse }): JSX.Element {
  // Derive MF from APR for display only (frontend never does math; this is
  // pure formatting — APR/2400 is the standard MF presentation).
  const aprNum = Number(response.apr_equivalent);
  const mfDisplay = Number.isFinite(aprNum) ? formatMoneyFactor(aprNum / 2400) : '—';

  return (
    <div className={styles.break}>
      <Row label="Base monthly"           value={formatCurrency(response.monthly_pre_tax)} />
      <Row label="+ Tax on monthly"       value={formatCurrency(response.monthly_tax)} />
      <Row label="Monthly (taxed)"        value={formatCurrency(response.monthly_total)} total />
      <Row label="Drive-off (1st + fees)" value={formatCurrency(response.drive_off)} />
      <Row label="Adjusted cap cost"      value={formatCurrencyRound(response.adjusted_cap_cost)} />
      <Row label="Residual at lease end"  value={formatCurrencyRound(response.residual_amount)} />
      <Row label="Money factor"           value={mfDisplay} />
      <Row label="APR equivalent"         value={`${aprNum.toFixed(3)}%`} />
      <Row label="Effective discount"     value={formatPercent(response.effective_discount_pct)} />
      <Row label="Total cost of lease"    value={formatCurrencyRound(response.total_cost_of_lease)} />
    </div>
  );
}


function Row({
  label, value, total,
}: {
  label: string;
  value: string;
  total?: boolean;
}): JSX.Element {
  return (
    <div className={total ? `${styles.row} ${styles.rowTotal}` : styles.row}>
      <span className={styles.rowL}>{label}</span>
      <span className={styles.rowV}>{value}</span>
    </div>
  );
}
