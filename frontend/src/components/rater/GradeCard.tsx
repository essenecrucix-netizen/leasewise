/**
 * GradeCard — pure-presentation polished `.dr` card with all 7 result
 * states plus the lifecycle states (empty, loading) the rater needs.
 *
 * State-state mapping:
 *   - 'empty'   → before submit
 *   - 'loading' → request in flight
 *   - 'A' / 'B' / 'C' / 'D' / 'F' → letter grade + percentile + comparables
 *   - 'low_data' → "Confidence (low data)" — extracted fields + markup,
 *                  no letter grade or percentile band. Phase 1.3 default.
 *   - 'error'   → extraction or scoring failed
 *
 * No fetching, no math beyond formatting. Everything numeric flows in
 * from the backend response or sample-preview synthetic values.
 */

import type {
  ConfidenceBand,
  ExtractedFields,
  FeedbackItem,
  GradeLetter,
  MarkupAnalysis,
  RaterResponse,
} from '@/lib/api-client';

import styles from './dr.module.css';


export type CardState =
  | { kind: 'empty' }
  | { kind: 'loading' }
  | { kind: 'error';    message: string }
  | { kind: 'low_data'; response: RaterResponse }
  | { kind: 'graded';   response: RaterResponse; letter: GradeLetter };


export function GradeCard(props: { state: CardState }): JSX.Element {
  switch (props.state.kind) {
    case 'empty':    return <Empty />;
    case 'loading':  return <Loading />;
    case 'error':    return <ErrorState message={props.state.message} />;
    case 'low_data': return <LowData response={props.state.response} />;
    case 'graded':   return <Graded response={props.state.response} letter={props.state.letter} />;
  }
}


// ── Variants ────────────────────────────────────────────────────────────

function Empty(): JSX.Element {
  return (
    <div className={`${styles.dr} ${styles.empty}`}>
      <div className={styles.emptyMark}>?</div>
      <p className={styles.emptyHint}>
        Paste a worksheet on the left to grade it. We score against the{' '}
        <span className={styles.emptyAccent}>captive lender base rate</span>{' '}
        and (when available) anonymized community deals.
      </p>
    </div>
  );
}


function Loading(): JSX.Element {
  return (
    <div className={styles.dr} aria-live="polite" aria-busy="true">
      <div className={styles.top}>
        <div className={`${styles.skel} ${styles.skelGrade}`} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className={`${styles.skel} ${styles.skelTitle}`} />
          <div className={`${styles.skel} ${styles.skelLine2}`} />
          <div className={`${styles.skel} ${styles.skelLine3}`} />
        </div>
      </div>
      <div className={`${styles.skel} ${styles.skelLine}`} />
      <div className={`${styles.skel} ${styles.skelLine}`} />
      <div className={`${styles.skel} ${styles.skelLine2}`} />
    </div>
  );
}


function ErrorState({ message }: { message: string }): JSX.Element {
  return (
    <div className={styles.dr} aria-live="polite">
      <div className={styles.errorFlag}>
        <strong>We couldn&rsquo;t grade that</strong>
        {message}
      </div>
    </div>
  );
}


function LowData({ response }: { response: RaterResponse }): JSX.Element {
  const { extracted, grade: letter } = response;
  return (
    <div className={styles.dr} aria-live="polite">
      <div className={styles.top}>
        <div className={`${styles.gradeLetter} ${gradeColorClass(letter ?? null)}`}>
          {letter ?? '?'}
        </div>
        <div className={styles.head}>
          <h3>{extracted.vehicle ?? 'Vehicle not detected'}</h3>
          <div className={styles.headMeta}>{metaLine(extracted)}</div>
          <div className={styles.lowDataBadge}>
            Confidence (low data) — {confidenceCopy(response.confidence_band, response.sample_size)}
          </div>
        </div>
      </div>
      {response.markup && <MarkupRow markup={response.markup} />}
      <FeedbackList items={response.feedback} />
      <div className={styles.sample}>
        <span>Phase 1.3 — signal-based grading until comparables flow in.</span>
      </div>
      <NotesBlock notes={response.notes} />
    </div>
  );
}


function Graded({
  response,
  letter,
}: {
  response: RaterResponse;
  letter:   GradeLetter;
}): JSX.Element {
  const { extracted } = response;
  return (
    <div className={styles.dr} aria-live="polite">
      <div className={styles.top}>
        <div className={`${styles.gradeLetter} ${gradeColorClass(letter)}`}>
          {letter}
        </div>
        <div className={styles.head}>
          <h3>{extracted.vehicle ?? 'Vehicle not detected'}</h3>
          <div className={styles.headMeta}>{metaLine(extracted)}</div>
          {response.percentile !== null && (
            <div className={styles.headPercentile}>
              P{response.percentile} · {percentileCopy(response.percentile)}
            </div>
          )}
        </div>
      </div>
      {response.markup && <MarkupRow markup={response.markup} />}
      <FeedbackList items={response.feedback} />
      <div className={styles.sample}>
        <span>
          n={response.sample_size} · {confidenceCopy(response.confidence_band, response.sample_size)}
        </span>
      </div>
      <NotesBlock notes={response.notes} />
    </div>
  );
}


// ── Sub-components ─────────────────────────────────────────────────────

function MarkupRow({ markup }: { markup: MarkupAnalysis }): JSX.Element {
  const bpsBad = markup.markup_bps > 25;
  const cap = Number(markup.captive_apr);
  const quo = Number(markup.quoted_apr);
  return (
    <div className={styles.markup}>
      <div className={styles.markupCell}>
        <span className={styles.markupLabel}>Captive base APR</span>
        <span className={styles.markupValue}>{cap.toFixed(2)}%</span>
      </div>
      <div className={styles.markupCell}>
        <span className={styles.markupLabel}>Dealer-quoted APR</span>
        <span className={`${styles.markupValue} ${bpsBad ? styles.markupValueBad : ''}`}>
          {quo.toFixed(2)}%
        </span>
      </div>
      <div className={styles.markupBpsLine}>
        Markup: <span className="mono">{markup.markup_bps} bps</span>
        {' · '}
        MF: <span className="mono">{Number(markup.captive_mf).toFixed(5)}</span>
        {' → '}
        <span className="mono">{Number(markup.quoted_mf).toFixed(5)}</span>
        {markup.cost_per_month_estimate && (
          <>
            {' · '}~${Number(markup.cost_per_month_estimate).toFixed(2)}/mo cost
          </>
        )}
      </div>
    </div>
  );
}


function FeedbackList({ items }: { items: FeedbackItem[] }): JSX.Element {
  return (
    <div className={styles.feedback}>
      {items.map((it, i) => (
        <div
          key={i}
          className={`${styles.fbItem} ${
            it.tone === 'good' ? styles.fbItemGood :
            it.tone === 'bad'  ? styles.fbItemBad  :
                                 styles.fbItemWarn
          }`}
        >
          <strong>{it.title}</strong>
          {it.body}
        </div>
      ))}
    </div>
  );
}


function NotesBlock({ notes }: { notes: string[] }): JSX.Element | null {
  if (!notes.length) return null;
  return (
    <div className={styles.notes}>
      <ul>
        {notes.map((n, i) => (<li key={i}>{n}</li>))}
      </ul>
    </div>
  );
}


// ── Helpers ─────────────────────────────────────────────────────────────

function gradeColorClass(letter: GradeLetter | null): string {
  // CSS module imports type as { [key: string]: string }; with
  // noUncheckedIndexedAccess every access returns string | undefined.
  // Coalesce to '' since a missing class is harmless (no tone applied).
  switch (letter) {
    case 'A': return styles.gradeA ?? '';
    case 'B': return styles.gradeB ?? '';
    case 'C': return styles.gradeC ?? '';
    case 'D': return styles.gradeD ?? '';
    case 'F': return styles.gradeF ?? '';
    default:  return styles.gradeQuestion ?? '';
  }
}


function metaLine(e: ExtractedFields): string {
  const parts: string[] = [];
  if (e.term_months) parts.push(`${e.term_months} mo`);
  if (e.annual_km)   parts.push(`${(e.annual_km / 1000).toFixed(0)}k km`);
  if (e.province_code) parts.push(e.province_code);
  return parts.length ? parts.join(' · ') : '—';
}


function confidenceCopy(band: ConfidenceBand, n: number): string {
  switch (band) {
    case 'high':              return `n=${n} comparables`;
    case 'medium':            return `n=${n} comparables (medium confidence)`;
    case 'low':               return `n=${n} comparables (low confidence)`;
    case 'insufficient_data': return 'no peer comparables yet (Phase 1.4)';
  }
}


function percentileCopy(p: number): string {
  if (p >= 80) return `better than ${p}% of recent deals`;
  if (p >= 60) return 'solid, room to negotiate';
  if (p >= 40) return 'around the median';
  if (p >= 20) return 'below median — counter hard';
  return 'walk away or counter aggressively';
}
