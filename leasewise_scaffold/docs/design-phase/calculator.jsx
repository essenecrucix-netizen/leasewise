// Calculator — full Lease Calculator page (Round 4)
// Output card uses the polished `.coc` component, with state derived from inputs:
//   - success: P >= 70, no markup
//   - good:    P 50-70
//   - warning: MF marked up beyond captive base
//   - edge:    BC luxury surtax triggers
//   - error:   no published program for combination
//   - stale:   program expired and not yet refreshed
// Shares chrome (Header/Footer) and tweaks panel via globals.

const { useState, useEffect, useMemo } = React;
const { Header: CHeader, Footer: CFooter, useTheme: cTheme, gradeColor: cGrade, ALL_PROVINCES: cAll } = window;

function Row({ label, value, bold }) {
  return (
    <div className="coc__row">
      <span className="coc__row-l">{label}</span>
      <span className={'coc__row-v' + (bold ? ' coc__row-v--bold' : '')}>{value}</span>
    </div>
  );
}

function CollapseGroup({ num, title, sub, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={'calc-group' + (open ? ' calc-group--open' : '')}>
      <button className="calc-group__head" onClick={() => setOpen(o => !o)}>
        <span style={{ display: 'flex', alignItems: 'center' }}>
          <span className="calc-group__num">0{num}</span>
          <span>{title}</span>
          {sub && <span className="c-faint" style={{ fontSize: 12, fontWeight: 400, marginLeft: 10 }}>{sub}</span>}
        </span>
        <svg className="calc-group__chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="6 9 12 15 18 9" /></svg>
      </button>
      {open && <div className="calc-group__body">{children}</div>}
    </div>
  );
}

// ── Output card variants ─────────────────────────────────────────
function COCSuccess({ veh, prog, out, percentile, grade, province, programLabel }) {
  const provName = window.LW_DATA.provinces[province].name;
  const provLabel = window.LW_DATA.provinces[province].label;
  const tone =
    percentile >= 75 ? 'good' :
    percentile >= 45 ? null   :
    'warn';
  return (
    <div className="coc" aria-live="polite">
      <div className="coc__eyebrow">
        <span>Estimated payment</span>
        <span style={{ color: 'var(--lime)' }}>● live · {programLabel}</span>
      </div>
      <div className="coc__pay">
        ${out.monthly.toFixed(0)}<sub>/mo · taxed in {province}</sub>
      </div>
      <div className={'coc__pctile' + (tone === 'good' ? ' coc__pctile--good' : tone === 'warn' ? ' coc__pctile--warn' : '')}>
        <span>
          {percentile >= 75 ? `Better than ${percentile}% of Apr deals (n=412)` :
           percentile >= 45 ? `Around the median for ${veh.model} in ${provName}` :
           `Below the median — there's room to negotiate`}
        </span>
        <span>P{percentile}</span>
      </div>
      <div className="coc__break">
        <Row label="Base monthly" value={'$' + out.basePayment.toFixed(2)} />
        <Row label={'+ ' + provLabel} value={'$' + out.tax.toFixed(2)} />
        <div className="coc__row coc__row--total">
          <span className="coc__row-l">Monthly (taxed)</span>
          <span className="coc__row-v">${out.monthly.toFixed(2)}</span>
        </div>
        <Row label="Drive-off (1st + fees)" value={'$' + Math.round(out.monthly + 745).toLocaleString('en-CA')} />
        <Row label="Adjusted cap cost" value={'$' + out.adjCap.toLocaleString('en-CA', { maximumFractionDigits: 0 })} />
        <Row label="Residual at lease end" value={'$' + out.residualValue.toLocaleString('en-CA', { maximumFractionDigits: 0 })} />
        <Row label="Money factor" value={out.mf.toFixed(5)} />
        <Row label={'Total cost (' + prog.term + ' mo)'} value={'$' + out.totalLease.toLocaleString('en-CA', { maximumFractionDigits: 0 })} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <a className="btn btn--accent" style={{ flex: 1 }} href="rater.html">Rate this against the database →</a>
      </div>
    </div>
  );
}

function COCWarning({ veh, prog, out, percentile, province, mfMarkup }) {
  const provLabel = window.LW_DATA.provinces[province].label;
  return (
    <div className="coc" aria-live="polite">
      <div className="coc__eyebrow">
        <span>Estimated payment</span>
        <span style={{ color: 'var(--amber)' }}>⚠ markup detected</span>
      </div>
      <div className="coc__pay coc__pay--warn">
        ${out.monthly.toFixed(0)}<sub>/mo · taxed in {province}</sub>
      </div>
      <div className="coc__pctile coc__pctile--warn">
        <span>Below average — {percentile}th percentile (n=287)</span>
        <span>P{percentile}</span>
      </div>
      <div className="coc__flag coc__flag--amber">
        <div>
          <strong>Money factor marked up</strong>
          Quoted MF {(out.mf + mfMarkup).toFixed(5)} ({((out.mf + mfMarkup) * 2400).toFixed(2)}%) vs. captive base {out.mf.toFixed(5)} ({(prog.rate).toFixed(2)}%). Costs you ~${Math.round(mfMarkup * out.adjCap)}/mo over {prog.term} months.
        </div>
      </div>
      <div className="coc__break">
        <Row label="Base monthly" value={'$' + out.basePayment.toFixed(2)} />
        <Row label={'+ ' + provLabel} value={'$' + out.tax.toFixed(2)} />
        <div className="coc__row coc__row--total">
          <span className="coc__row-l">Monthly (taxed)</span>
          <span className="coc__row-v">${out.monthly.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

function COCEdge({ veh, prog, out, province }) {
  return (
    <div className="coc" aria-live="polite">
      <div className="coc__eyebrow">
        <span>Estimated payment</span>
        <span style={{ color: 'var(--blood-orange)' }}>● BC luxury surtax</span>
      </div>
      <div className="coc__pay">
        ${out.monthly.toFixed(0)}<sub>/mo · BC</sub>
      </div>
      <div className="coc__flag">
        <div>
          <strong>BC luxury surtax applies</strong>
          {veh.year} {veh.make} {veh.model} at ${veh.msrp.toLocaleString('en-CA')} exceeds the $124,999 threshold. Additional 5% PST on the purchase portion ≈ ${Math.round(veh.msrp * 0.05 * (1 - prog.residual)).toLocaleString('en-CA')} over the term.
        </div>
      </div>
      <div className="coc__break">
        <Row label="Base monthly" value={'$' + out.basePayment.toFixed(2)} />
        <Row label="+ GST 5% + PST 7%" value={'$' + (out.tax * 0.85).toFixed(2)} />
        <Row label="+ Luxury surcharge" value={'$' + (out.tax * 0.15).toFixed(2)} />
        <div className="coc__row coc__row--total">
          <span className="coc__row-l">Monthly (taxed)</span>
          <span className="coc__row-v">${out.monthly.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

function COCError({ veh, term, onTerm, suggestedTerm }) {
  return (
    <div className="coc" aria-live="polite">
      <div className="coc__eyebrow">
        <span style={{ color: 'var(--blood-orange)' }}>● No active program</span>
      </div>
      <div className="coc__pay coc__pay--muted">
        $ —<sub>/mo · taxed</sub>
      </div>
      <div className="coc__flag">
        <div>
          <strong>No published lease program for this trim/term</strong>
          Captive lender does not currently publish a {term}-mo program on the {veh.year} {veh.model}. Try {suggestedTerm} mo, or rate a worksheet directly.
        </div>
      </div>
      <div className="coc__actions">
        <button className="btn btn--accent" onClick={() => onTerm(suggestedTerm)}>Try {suggestedTerm} months</button>
        <a className="btn btn--secondary" href="rater.html">Rate a worksheet</a>
      </div>
    </div>
  );
}

function COCStale({ veh, prog, out, province }) {
  return (
    <div className="coc" style={{ opacity: 0.92 }} aria-live="polite">
      <div className="coc__eyebrow">
        <span>Last-known payment</span>
        <span style={{ color: 'var(--amber)' }}>⏱ March 2026 program · expired</span>
      </div>
      <div className="coc__pay coc__pay--muted">
        ${out.monthly.toFixed(0)}<sub>/mo · taxed in {province}</sub>
      </div>
      <div className="coc__flag coc__flag--amber">
        <div>
          <strong>Program ended Mar 31, 2026</strong>
          April program not yet published for {veh.make}. Last seen: {prog.rate.toFixed(2)}% / {(prog.residual * 100).toFixed(0)}% RV. We'll auto-update within 24h of release.
        </div>
      </div>
    </div>
  );
}

// ── Main app ─────────────────────────────────────────────────────
function CalculatorApp() {
  const [theme, toggleTheme] = cTheme();
  const D = window.LW_DATA, M = window.LW_MATH;

  const [vehId, setVehId] = useState('bmw-x3-30i-2026');
  const veh = D.vehicles.find(v => v.id === vehId);
  const [progIdx, setProgIdx] = useState(() => Math.max(0, veh.programs.findIndex(p => p.headline)));
  const prog = veh.programs[progIdx];

  const [province, setProvince] = useState('AB');
  const [discount, setDiscount] = useState(2400);
  const [down, setDown] = useState(0);
  const [tradeEquity, setTradeEquity] = useState(0);
  const [incentives, setIncentives] = useState(veh.loyalty || 0);
  const [kmYr, setKmYr] = useState(prog.kmYr);

  // Tweaks panel: simulate states for demo/screenshots
  const [forcedState, setForcedState] = useState('auto');

  useEffect(() => {
    const i = Math.max(0, veh.programs.findIndex(p => p.headline));
    setProgIdx(i);
    setIncentives(veh.loyalty || 0);
    setKmYr(veh.programs[i].kmYr);
  }, [vehId]);

  const out = M.leasePayment({
    msrp: veh.msrp, freight: veh.freight,
    discount, residualPct: prog.residual, apr: prog.rate,
    term: prog.term, downPayment: down, tradeEquity, incentives,
    province,
  });

  const userPctOfMsrp = (out.monthly / veh.msrp) * 100;
  const percentile = Math.max(5, Math.min(98, Math.round(40 + (discount / 100) * 0.8 + (incentives / 200))));
  const grade = percentile >= 80 ? 'A' : percentile >= 65 ? 'B' : percentile >= 45 ? 'C' : percentile >= 25 ? 'D' : 'F';

  const luxFlag = province === 'BC' && veh.msrp > 124999;
  const programLabel = `${veh.make} ${veh.year >= 2026 ? 'Apr 2026' : 'Apr 2026'}`;

  // State derivation
  const detectedState =
    luxFlag ? 'edge' :
    percentile < 30 ? 'warning' :
    'success';

  const renderState = forcedState === 'auto' ? detectedState : forcedState;

  return (
    <div className="lw-app">
      <CHeader active="tools" theme={theme} onToggleTheme={toggleTheme} />
      <main id="main">
        <section className="calc-page">
          <div className="container">
            <div className="calc-page__head">
              <div>
                <span className="eyebrow">Tool · /tools/calculator</span>
                <h1 className="t-h1">Canadian lease calculator.</h1>
                <p className="t-body-l">Provincial tax math handled correctly. Your inputs stay in your browser — no account required, ever.</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div className="calc-modes" role="tablist" aria-label="Calculator mode">
                  <button role="tab" aria-selected="true" className="calc-mode calc-mode--active">Forward</button>
                  <button role="tab" aria-selected="false" className="calc-mode" title="Calculate from a target payment back to selling price">Reverse</button>
                </div>
                <a className="btn btn--secondary btn--sm" href="#">Save scenario</a>
              </div>
            </div>

            <div className="calc-grid">
              {/* INPUTS */}
              <div>
                <CollapseGroup num={1} title="Vehicle" sub={veh.year + ' ' + veh.make + ' ' + veh.model} defaultOpen>
                  <div className="calc-field">
                    <label>Preset</label>
                    <div className="preset-grid">
                      {D.vehicles.map(v => (
                        <button key={v.id}
                          className={'preset' + (v.id === vehId ? ' preset--active' : '')}
                          onClick={() => setVehId(v.id)}>
                          <span className="preset__veh">{v.year} {v.make} {v.model}</span>
                          <span className="preset__msrp">{v.trim} · ${v.msrp.toLocaleString('en-CA')}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="calc-field__row">
                    <div className="calc-field">
                      <label>MSRP</label>
                      <div className="field-affix">
                        <span className="affix">$</span>
                        <input type="text" value={veh.msrp.toLocaleString('en-CA')} readOnly />
                      </div>
                    </div>
                    <div className="calc-field">
                      <label>Freight & PDI</label>
                      <div className="field-affix">
                        <span className="affix">$</span>
                        <input type="text" value={veh.freight.toLocaleString('en-CA')} readOnly />
                      </div>
                    </div>
                  </div>
                </CollapseGroup>

                <CollapseGroup num={2} title="Lease structure" sub={prog.term + 'mo · ' + prog.rate.toFixed(2) + '%'} defaultOpen>
                  <div className="calc-field">
                    <label>Captive program</label>
                    <div className="term-pills">
                      {veh.programs.map((p, i) => (
                        <button key={i} className={'term-pill' + (i === progIdx ? ' term-pill--active' : '')}
                          onClick={() => { setProgIdx(i); setKmYr(p.kmYr); }}>
                          {p.term}mo / {p.rate.toFixed(2)}% / {(p.residual * 100).toFixed(0)}%
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="calc-field__row">
                    <div className="calc-field">
                      <label>Lease rate (APR)</label>
                      <div className="field-affix">
                        <input type="number" step="0.01" value={prog.rate} readOnly />
                        <span className="affix affix--right">%</span>
                      </div>
                      <div className="calc-field__hint">Money factor: <span className="mono">{(prog.rate / 2400).toFixed(5)}</span> · captive subvented</div>
                    </div>
                    <div className="calc-field">
                      <label>Residual</label>
                      <div className="field-affix">
                        <input type="number" value={(prog.residual * 100).toFixed(0)} readOnly />
                        <span className="affix affix--right">%</span>
                      </div>
                      <div className="calc-field__hint">${(veh.msrp * prog.residual).toLocaleString('en-CA', { maximumFractionDigits: 0 })} at lease end</div>
                    </div>
                  </div>
                  <div className="calc-field">
                    <label>Kilometres / year <span className="c-faint mono" style={{ fontWeight: 400 }}>{kmYr.toLocaleString('en-CA')}</span></label>
                    <input type="range" min="12000" max="32000" step="2000" value={kmYr} onChange={e => setKmYr(+e.target.value)} className="lw-slider" />
                  </div>
                </CollapseGroup>

                <CollapseGroup num={3} title="Cash position" sub={'−$' + (discount + down + tradeEquity + incentives).toLocaleString('en-CA') + ' off cap'} defaultOpen>
                  <div className="calc-field">
                    <label>Discount off MSRP <span className="c-faint mono" style={{ fontWeight: 400 }}>${discount.toLocaleString('en-CA')} ({((discount / veh.msrp) * 100).toFixed(1)}%)</span></label>
                    <input type="range" min="0" max="12000" step="100" value={discount} onChange={e => setDiscount(+e.target.value)} className="lw-slider" />
                  </div>
                  <div className="calc-field">
                    <label>Cash incentives <span className="c-faint mono" style={{ fontWeight: 400 }}>${incentives.toLocaleString('en-CA')}</span></label>
                    <input type="range" min="0" max="5000" step="250" value={incentives} onChange={e => setIncentives(+e.target.value)} className="lw-slider" />
                    <div className="calc-field__hint">Loyalty {veh.loyalty ? '$' + veh.loyalty : '—'} · Conquest {veh.conquest ? '$' + veh.conquest : '—'} · stack-compatible</div>
                  </div>
                  <div className="calc-field__row">
                    <div className="calc-field">
                      <label>Down payment</label>
                      <div className="field-affix">
                        <span className="affix">$</span>
                        <input type="number" value={down} onChange={e => setDown(+e.target.value || 0)} />
                      </div>
                      <div className="calc-field__hint">Most lease pros recommend $0 down.</div>
                    </div>
                    <div className="calc-field">
                      <label>Trade equity</label>
                      <div className="field-affix">
                        <span className="affix">$</span>
                        <input type="number" value={tradeEquity} onChange={e => setTradeEquity(+e.target.value || 0)} />
                      </div>
                    </div>
                  </div>
                </CollapseGroup>

                <CollapseGroup num={4} title="Province & taxes" sub={D.provinces[province].name + ' · ' + D.provinces[province].label} defaultOpen>
                  <div className="calc-field">
                    <label>Province</label>
                    <div className="prov-grid">
                      {cAll.map(p => (
                        <button key={p} className={'prov-btn' + (p === province ? ' prov-btn--active' : '')}
                          onClick={() => setProvince(p)} title={D.provinces[p].name}>{p}</button>
                      ))}
                    </div>
                  </div>
                  <div className="tax-box">
                    <div className="tax-box__head">
                      <span className="t-body-s c-secondary">{D.provinces[province].label}</span>
                      <span className="mono c-muted t-body-s">{(out.taxRate * 100).toFixed(3)}% on monthly</span>
                    </div>
                    <div className="calc-row"><span className="calc-row__l">Pre-tax monthly</span><span className="calc-row__v mono">${out.basePayment.toFixed(2)}</span></div>
                    <div className="calc-row"><span className="calc-row__l">Tax on monthly</span><span className="calc-row__v mono">+ ${out.tax.toFixed(2)}</span></div>
                    <div className="calc-row"><span className="calc-row__l" style={{ fontWeight: 500, color: 'var(--text)' }}>Total monthly</span><span className="calc-row__v mono" style={{ fontWeight: 600 }}>${out.monthly.toFixed(2)}</span></div>
                  </div>
                </CollapseGroup>
              </div>

              {/* OUTPUT (sticky on desktop) */}
              <div className="calc-output-col">
                {renderState === 'edge'    && <COCEdge    veh={veh} prog={prog} out={out} province={province} />}
                {renderState === 'warning' && <COCWarning veh={veh} prog={prog} out={out} percentile={percentile} province={province} mfMarkup={0.00084} />}
                {renderState === 'error'   && <COCError   veh={veh} term={24} onTerm={() => setForcedState('auto')} suggestedTerm={prog.term} />}
                {renderState === 'stale'   && <COCStale   veh={veh} prog={prog} out={out} province={province} />}
                {renderState === 'success' && (
                  <COCSuccess
                    veh={veh} prog={prog} out={out}
                    percentile={percentile} grade={grade}
                    province={province} programLabel={programLabel}
                  />
                )}

                {/* State preview controls — shown to designers, hidden in customer-facing tweak panel */}
                <div className="card" style={{ padding: 12, marginTop: 12 }}>
                  <div className="eyebrow" style={{ marginBottom: 8 }}>State preview</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {['auto', 'success', 'warning', 'edge', 'error', 'stale'].map(s => (
                      <button key={s}
                        className={'term-pill' + (forcedState === s ? ' term-pill--active' : '')}
                        onClick={() => setForcedState(s)}>
                        {s}
                      </button>
                    ))}
                  </div>
                  <div className="t-body-s c-muted" style={{ marginTop: 8, fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                    Detected: {detectedState} · {province === 'BC' && veh.msrp > 124999 ? 'BC luxury triggered' : 'normal'}
                  </div>
                </div>

                <div className="percentile">
                  <div className="percentile__head">
                    <span className="percentile__title">Where this deal sits</span>
                    <span className="percentile__sample">n=31 · {veh.model} · Western Canada · trailing 90d</span>
                  </div>
                  <div className="percentile__bar">
                    <div className="percentile__fill" />
                    <div className="percentile__marker" style={{ left: percentile + '%' }} />
                  </div>
                  <div className="percentile__labels">
                    <span>P0 worst</span><span>P25</span><span>P50 median</span><span>P75</span><span>P100 best</span>
                  </div>
                  <p className="percentile__caption">
                    Based on 31 closed <strong>{veh.model}</strong> deals reported by the community. Median discount is 9% off MSRP; the top quartile is 14% off.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <CFooter />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<CalculatorApp />);
