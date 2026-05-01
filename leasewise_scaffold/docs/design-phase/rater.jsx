// Deal Rater (Round 4) — paste worksheet → letter grade
// Three input modes: paste text, upload PDF (drop-zone preview), manual entry (links to calculator).
// Result card renders the polished `.dr` grade component, which adapts tone by grade letter.
const { useState, useMemo } = React;
const { Header: RHeader, Footer: RFooter, useTheme: rTheme, gradeColor: rGrade } = window;

const SAMPLE_A = `2026 BMW X3 xDrive30i
MSRP: $62,400
Freight & PDI: $2,480
Selling Price: $58,900
Term: 39 months
Money Factor: 0.00166 (3.99% APR)
Residual: 59% ($36,816)
KM/yr: 16,000
Down Payment: $0
Trade Equity: $0
Loyalty: $1,500
Province: Alberta
Monthly Payment (taxed): $698`;

const SAMPLE_B = `2026 Honda CR-V Hybrid Touring
MSRP: $49,100
Freight: $1,995
Selling Price: $48,200
Term: 48 months
Money Factor: 0.00187 (4.49% APR)
Residual: 55%
KM/yr: 20,000
Down: $0
Province: Ontario
Doc fee: $799
Monthly (taxed): $612`;

const SAMPLE_D = `2025 Mercedes-Benz GLC 300 4MATIC
MSRP: $60,500
Freight: $2,895
Selling Price: $61,200
Term: 36 months
Money Factor: 0.00275 (6.60% APR)
Residual: 56%
KM/yr: 18,000
Province: British Columbia
Wear protection: $42/mo
Monthly (taxed): $948`;

// ── Grade card variants (polished .dr) ──────────────────────────
function GradeA({ extracted }) {
  return (
    <div className="dr">
      <div className="dr__top">
        <div className="dr__grade" style={{ color: 'var(--lime)' }}>A</div>
        <div className="dr__head">
          <h3>{extracted.vehicle}</h3>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{extracted.term} mo · {extracted.km}k km · {extracted.province}</div>
          <div className="dr__pct" style={{ marginTop: 6 }}>P84 · better than 84% of Apr deals</div>
        </div>
      </div>
      <div className="dr__compare">
        <div className="dr__comparecell"><div className="dr__comparecell-l">Your $/mo</div><div className="dr__comparecell-v" style={{ color: 'var(--lime)' }}>${extracted.payment}</div></div>
        <div className="dr__comparecell"><div className="dr__comparecell-l">Median</div><div className="dr__comparecell-v">$742</div></div>
        <div className="dr__comparecell"><div className="dr__comparecell-l">Best 10%</div><div className="dr__comparecell-v">$684</div></div>
      </div>
      <div className="dr__fb">
        <div className="dr__fbitem dr__fbitem--good"><strong>Money factor matches captive base</strong>0.00166 = 3.99% APR — no markup. ~92% of dealers mark this up.</div>
        <div className="dr__fbitem dr__fbitem--good"><strong>Loyalty applied correctly</strong>$1,500 BMW loyalty is on the worksheet as a cap reduction.</div>
        <div className="dr__fbitem"><strong>Acquisition fee at par</strong>$675 is the BMW captive standard for ON/AB/BC.</div>
      </div>
      <div className="dr__sample">
        <span>n=412 · Apr 2026 · same trim/term/province</span>
        <button className="btn btn--secondary btn--sm">Share anonymously</button>
      </div>
    </div>
  );
}

function GradeB({ extracted }) {
  return (
    <div className="dr">
      <div className="dr__top">
        <div className="dr__grade" style={{ color: 'var(--emerald)' }}>B</div>
        <div className="dr__head">
          <h3>{extracted.vehicle}</h3>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{extracted.term} mo · {extracted.km}k km · {extracted.province}</div>
          <div className="dr__pct" style={{ marginTop: 6 }}>P61 · solid, room to negotiate</div>
        </div>
      </div>
      <div className="dr__compare">
        <div className="dr__comparecell"><div className="dr__comparecell-l">Your $/mo</div><div className="dr__comparecell-v">${extracted.payment}</div></div>
        <div className="dr__comparecell"><div className="dr__comparecell-l">Median</div><div className="dr__comparecell-v">$598</div></div>
        <div className="dr__comparecell"><div className="dr__comparecell-l">Best 10%</div><div className="dr__comparecell-v">$556</div></div>
      </div>
      <div className="dr__fb">
        <div className="dr__fbitem dr__fbitem--good"><strong>MF at captive base</strong>0.00187 (4.49%) — no markup.</div>
        <div className="dr__fbitem dr__fbitem--warn"><strong>Selling price 1.8% over best comp</strong>You're at $48,200 vs. lowest April comp of $47,350 (Markham Honda).</div>
        <div className="dr__fbitem dr__fbitem--warn"><strong>Doc fee high for ON</strong>$799 vs. provincial average of $499. Push back — most dealers will move $200+.</div>
      </div>
      <div className="dr__sample">
        <span>n=298 · Apr 2026 · same trim/term/province</span>
        <button className="btn btn--secondary btn--sm">Share anonymously</button>
      </div>
    </div>
  );
}

function GradeD({ extracted }) {
  return (
    <div className="dr">
      <div className="dr__top">
        <div className="dr__grade" style={{ color: 'var(--blood-orange)' }}>D</div>
        <div className="dr__head">
          <h3>{extracted.vehicle}</h3>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{extracted.term} mo · {extracted.km}k km · {extracted.province}</div>
          <div className="dr__pct" style={{ marginTop: 6 }}>P14 · walk away or counter hard</div>
        </div>
      </div>
      <div className="dr__compare">
        <div className="dr__comparecell"><div className="dr__comparecell-l">Your $/mo</div><div className="dr__comparecell-v" style={{ color: 'var(--blood-orange)' }}>${extracted.payment}</div></div>
        <div className="dr__comparecell"><div className="dr__comparecell-l">Median</div><div className="dr__comparecell-v">$842</div></div>
        <div className="dr__comparecell"><div className="dr__comparecell-l">Best 10%</div><div className="dr__comparecell-v">$789</div></div>
      </div>
      <div className="dr__fb">
        <div className="dr__fbitem dr__fbitem--bad"><strong>MF marked up 80 bps</strong>0.00275 (6.60%) vs. MB-Financial base 0.00250 (5.99%). Costs $58/mo over the term — $2,088 total.</div>
        <div className="dr__fbitem dr__fbitem--bad"><strong>Residual 4 pts below program</strong>56% on the worksheet vs. published 60% — moves base monthly up ~$92.</div>
        <div className="dr__fbitem dr__fbitem--warn"><strong>"Wear protection" $42/mo</strong>Optional GAP/wear add-on. Decline; refundable on most MB lease contracts.</div>
      </div>
      <div className="dr__sample">
        <span>n=87 · Apr 2026 · same trim/term/province</span>
        <button className="btn btn--secondary btn--sm">Get rebuttal script</button>
      </div>
    </div>
  );
}

// Empty state — before paste
function GradeEmpty() {
  return (
    <div className="dr" style={{ alignItems: 'center', justifyContent: 'center', minHeight: 400, textAlign: 'center', color: 'var(--text-muted)' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 96, lineHeight: 1, color: 'var(--border-strong)', fontWeight: 500, letterSpacing: '-0.045em' }}>?</div>
      <div style={{ fontSize: 14, marginTop: 16, maxWidth: 280 }}>
        Paste a worksheet on the left to grade it against {' '}
        <span style={{ color: 'var(--lime)' }}>1,247 anonymized Canadian leases</span>.
      </div>
    </div>
  );
}

// ── Extraction ───────────────────────────────────────────────────
function extract(text) {
  const get = (re, fallback = '—') => { const m = text.match(re); return m && m[1] ? m[1].trim() : fallback; };
  const num = (re) => { const v = get(re); return v.replace(/[$,]/g, '') || '—'; };
  return {
    vehicle: get(/(20\d{2}\s+[A-Z][^\n]+)/i),
    msrp: num(/MSRP[:\s]+\$?([\d,]+)/i),
    selling: num(/Selling Price[:\s]+\$?([\d,]+)/i),
    term: get(/Term[:\s]+(\d+)/i),
    apr: get(/([\d.]+)%\s*APR/i, ''),
    mf: get(/Money Factor[:\s]+([\d.]+)/i),
    residual: get(/Residual[:\s]+(\d+)%/i),
    payment: num(/Monthly[^$]*\$?([\d,.]+)/i),
    km: get(/KM[\/\s]*yr[:\s]+([\d,]+)/i, '16').replace(/,/g, '').replace(/000$/, ''),
    province: get(/Province[:\s]+(\w+(?:\s\w+)?)/i),
    loyalty: num(/Loyalty[:\s]+\$?([\d,]+)/i),
  };
}

// Grade detector — match the sample to its canonical grade
function detectGrade(text) {
  if (/MERCEDES|GLC 300|6\.6/i.test(text)) return 'D';
  if (/CR-V|HONDA/i.test(text)) return 'B';
  if (/BMW|X3/i.test(text)) return 'A';
  return 'A';
}

function ExtractRow({ label, value, faded }) {
  return (
    <div className="rater-extract__row" style={faded ? { opacity: 0.5 } : null}>
      <span className="c-muted">{label}</span>
      <span className="mono">{value}</span>
    </div>
  );
}

function RaterApp() {
  const [theme, toggle] = rTheme();
  const D = window.LW_DATA;

  const [tab, setTab] = useState('paste');
  const [text, setText] = useState(SAMPLE_A);
  const [graded, setGraded] = useState(true); // start with sample graded so the result is visible

  const extracted = useMemo(() => extract(text), [text]);
  const grade = useMemo(() => detectGrade(text), [text]);

  const setSample = (sample) => { setText(sample); setGraded(true); };

  return (
    <div className="lw-app">
      <RHeader active="tools" theme={theme} onToggleTheme={toggle} />
      <main id="main">
        <section className="rater-page">
          <div className="container">
            <div style={{ marginBottom: 32 }}>
              <span className="eyebrow">Tool · /tools/deal-rater</span>
              <h1 className="t-h1" style={{ margin: '6px 0 8px' }}>Rate your dealer worksheet.</h1>
              <p className="t-body-l c-secondary" style={{ margin: 0, maxWidth: '60ch' }}>
                Paste the document, drop a PDF, or type the numbers. We score it against the community deal database — anonymously.
              </p>
            </div>

            <div className="rater-grid">
              {/* INPUT */}
              <div>
                <div className="dr__input-tabs">
                  <button className={'dr__input-tab' + (tab === 'paste' ? ' dr__input-tab--active' : '')} onClick={() => setTab('paste')}>Paste worksheet</button>
                  <button className={'dr__input-tab' + (tab === 'upload' ? ' dr__input-tab--active' : '')} onClick={() => setTab('upload')}>Upload PDF</button>
                  <button className={'dr__input-tab' + (tab === 'manual' ? ' dr__input-tab--active' : '')} onClick={() => setTab('manual')}>Type it out</button>
                </div>

                {tab === 'paste' && (
                  <div style={{ marginTop: 16 }}>
                    <textarea
                      className="dr__textarea"
                      value={text}
                      onChange={e => { setText(e.target.value); setGraded(false); }}
                      placeholder="Paste your dealer worksheet here. We extract the numbers automatically."
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <span className="t-body-s c-muted" style={{ marginRight: 4 }}>Try:</span>
                        <button className="term-pill" onClick={() => setSample(SAMPLE_A)}>BMW X3 (A)</button>
                        <button className="term-pill" onClick={() => setSample(SAMPLE_B)}>Honda CR-V (B)</button>
                        <button className="term-pill" onClick={() => setSample(SAMPLE_D)}>MB GLC (D)</button>
                      </div>
                      <button className="btn btn--accent btn--sm" onClick={() => setGraded(true)}>
                        {graded ? 'Re-grade' : 'Rate this deal →'}
                      </button>
                    </div>

                    <div className="rater-extract">
                      <ExtractRow label="Vehicle" value={extracted.vehicle.length > 28 ? extracted.vehicle.slice(0, 28) + '…' : extracted.vehicle} />
                      <ExtractRow label="MSRP" value={'$' + extracted.msrp} />
                      <ExtractRow label="Selling" value={'$' + extracted.selling} />
                      <ExtractRow label="Term" value={extracted.term + ' mo'} />
                      <ExtractRow label="APR" value={extracted.apr ? extracted.apr + '%' : '—'} />
                      <ExtractRow label="MF" value={extracted.mf} />
                      <ExtractRow label="Residual" value={extracted.residual + '%'} />
                      <ExtractRow label="Payment" value={'$' + extracted.payment} />
                      <ExtractRow label="Province" value={extracted.province} />
                      <ExtractRow label="Loyalty" value={extracted.loyalty === '—' ? '—' : '$' + extracted.loyalty} faded={extracted.loyalty === '—'} />
                    </div>

                    <div className="t-body-s c-muted" style={{ marginTop: 12, fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                      Anonymous · we strip dealer/customer names automatically before saving.
                    </div>
                  </div>
                )}

                {tab === 'upload' && (
                  <div style={{ marginTop: 16 }}>
                    <div className="dr__dropzone">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25">
                        <path d="M14 3v4a1 1 0 0 0 1 1h4" />
                        <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" />
                        <path d="M12 12v6m-3-3 3-3 3 3" />
                      </svg>
                      <div className="t-h3" style={{ color: 'var(--text)', margin: 0 }}>Drop your PDF worksheet here</div>
                      <div className="t-body-s">Or click to browse — up to 5MB · text PDFs only</div>
                      <div className="t-body-s c-muted" style={{ fontSize: 11, fontFamily: 'var(--font-mono)', marginTop: 8 }}>
                        Tip: most dealers email a text PDF if you ask for "the lease pencil"
                      </div>
                    </div>
                  </div>
                )}

                {tab === 'manual' && (
                  <div className="card" style={{ marginTop: 16 }}>
                    <p className="c-secondary" style={{ margin: '0 0 12px' }}>Manual entry uses the same form as the calculator. Enter your numbers there, then click "Rate this against the database".</p>
                    <a className="btn btn--secondary" href="calculator.html">Go to calculator →</a>
                  </div>
                )}
              </div>

              {/* OUTPUT */}
              <div>
                {!graded || tab !== 'paste' ? <GradeEmpty /> :
                 grade === 'A' ? <GradeA extracted={extracted} /> :
                 grade === 'B' ? <GradeB extracted={extracted} /> :
                                 <GradeD extracted={extracted} />}

                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <a className="btn btn--secondary" href="calculator.html">Open in calculator</a>
                  <a className="btn btn--ghost" href="forum.html">Discuss this deal →</a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <RFooter />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<RaterApp />);
