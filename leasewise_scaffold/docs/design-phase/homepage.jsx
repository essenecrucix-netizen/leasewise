// Homepage — dark hero with deal ticker, calculator preview, floorplan clock,
// programs table, community, sources strip.

const { Header: HHeader, Footer: HFooter, useTicker: hTicker, useTheme: hTheme, gradeColor: hGrade } = window;

// ── Live deal ticker ────────────────────────────────────────────────────
function DealTicker({ deals }) {
  const [paused, setPaused] = useState(false);
  // duplicate deals for seamless loop
  const items = useMemo(() => [...deals, ...deals], [deals]);
  return (
    <div className="ticker" onMouseEnter={()=>setPaused(true)} onMouseLeave={()=>setPaused(false)}
         onFocus={()=>setPaused(true)} onBlur={()=>setPaused(false)} tabIndex={0}
         aria-label="Live community deals — pause on hover">
      <div className="ticker__track" style={{ animationPlayState: paused ? 'paused' : 'running' }}>
        {items.map((d, i) => (
          <div className="ticker__card" key={i}>
            <div className="ticker__top">
              <span className="ticker__veh">{d.vehicle}</span>
              <span className="ticker__prov">{d.province}</span>
            </div>
            <div className="ticker__row">
              <div>
                <div className="ticker__label">Monthly</div>
                <div className="ticker__pay mono">${d.payment.toLocaleString('en-CA')}</div>
              </div>
              <div>
                <div className="ticker__label">Term · Rate</div>
                <div className="ticker__meta mono">{d.term}mo · {d.rate.toFixed(2)}%</div>
              </div>
              <div className="ticker__grade" style={{ color: hGrade(d.grade) }}>
                <div className="ticker__letter mono">{d.grade}</div>
                <div className="ticker__pct mono">P{d.percentile}</div>
              </div>
            </div>
            <div className="ticker__foot">
              <span className="mono c-faint">{d.dealer}</span>
              <span className="mono c-faint">{d.when}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Hero ────────────────────────────────────────────────────────────────
function Hero() {
  const D = window.LW_DATA;
  return (
    <section className="hero" id="main">
      <div className="container">
        <div className="hero__eyebrow eyebrow">
          <span className="hero__dot" /> Live from the forum
        </div>
        <DealTicker deals={D.recentDeals} />
        <div className="hero__meta mono">
          Updated continuously · {D.recentDeals.length * 18} deals submitted in the last 30 days · Median percentile {62}
        </div>

        <div className="hero__split">
          <div>
            <h1 className="hero__title t-display-xl">Know what dealers&nbsp;know.</h1>
            <p className="hero__sub t-body-l">
              Real Canadian lease data. Real numbers. Real provincial tax math.<br/>
              No accounts required to start. No leads sold to dealers, ever.
            </p>
            <div className="hero__cta">
              <a className="btn btn--accent btn--lg" href="calculator.html">Open the calculator →</a>
              <a className="btn btn--secondary btn--lg" href="#why">How dealers get an edge</a>
            </div>
          </div>
          <FloorplanClock fp={D.floorplan} />
        </div>
      </div>
    </section>
  );
}

// ── Floorplan clock — counts up per second ─────────────────────────────
function FloorplanClock({ fp }) {
  const t = hTicker(1000);
  // accrued = capCost * rate / 365 * daysOnLot (+ live increment per second within the day)
  const perDay = fp.capCost * fp.floorplanRate / 365;
  const perSec = perDay / 86400;
  const startMs = useRef(Date.now()).current;
  const elapsedSec = (Date.now() - startMs) / 1000 + t * 0; // recompute each render
  const accrued = perDay * fp.daysOnLot + perSec * elapsedSec;
  return (
    <div className="floorplan">
      <div className="floorplan__head">
        <span className="eyebrow" style={{color:'var(--lime)'}}>● Floorplan clock</span>
        <span className="mono c-faint" style={{fontSize:11}}>VIN {fp.vin.slice(-7)}</span>
      </div>
      <div className="floorplan__veh">{fp.vehicle}</div>
      <div className="floorplan__dealer mono">{fp.dealer}</div>

      <div className="floorplan__big">
        <div>
          <div className="eyebrow" style={{color:'var(--hero-muted)'}}>Days on lot</div>
          <div className="floorplan__dol mono">{fp.daysOnLot}</div>
        </div>
        <div>
          <div className="eyebrow" style={{color:'var(--hero-muted)'}}>Accrued floorplan interest</div>
          <div className="floorplan__cash mono">
            ${accrued.toLocaleString('en-CA',{minimumFractionDigits:2,maximumFractionDigits:2})}
          </div>
        </div>
      </div>
      <div className="floorplan__rate mono">
        @ {(fp.floorplanRate*100).toFixed(2)}% · ${perDay.toFixed(2)}/day · ticking up ${perSec.toFixed(5)}/sec
      </div>
    </div>
  );
}

// ── Three-column "what dealers know" panel ─────────────────────────────
function WhatDealersKnow() {
  const items = [
    { n:'01', title:'Money factor, not APR',
      body:'Dealers quote you payment. Behind it sits a money factor (0.00208) that maps to an APR (4.99%). When dealers mark up the rate by 0.50%, you pay that for 39 months. We show both.' },
    { n:'02', title:'Days on lot is leverage',
      body:'A 90-day-old BMW X3 is costing the dealer $11.27 a day in floorplan interest. They want it gone. We surface inventory age so you can ask for the right car at the right time.' },
    { n:'03', title:'Programs change monthly',
      body:'Captive lender rates and residuals reset around the first of each month. A 3.99% rate this week may be 5.49% next Monday. We track every change for the brands Canadians lease.' },
  ];
  return (
    <section className="why" id="why">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">The three things</span>
          <h2 className="t-h1">What dealers know that most buyers don't.</h2>
        </div>
        <div className="why__grid">
          {items.map(it => (
            <div className="why__card" key={it.n}>
              <div className="why__num mono">{it.n}</div>
              <div className="why__title t-h3">{it.title}</div>
              <p className="why__body">{it.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Featured calculator preview (compact) ──────────────────────────────
function CalcPreview() {
  const D = window.LW_DATA, M = window.LW_MATH;
  const veh = D.vehicles[0]; // BMW X3
  const prog = veh.programs.find(p => p.headline) || veh.programs[0];
  const [province, setProvince] = useState('AB');
  const [discount, setDiscount] = useState(2400);
  const [down, setDown] = useState(0);

  const out = M.leasePayment({
    msrp: veh.msrp, freight: veh.freight,
    discount, residualPct: prog.residual, apr: prog.rate,
    term: prog.term, downPayment: down, province,
  });

  return (
    <section className="calc-preview">
      <div className="container">
        <div className="section-head section-head--row">
          <div>
            <span className="eyebrow">Featured tool</span>
            <h2 className="t-h1">Calculator — try it without an account.</h2>
          </div>
          <a className="btn btn--secondary" href="calculator.html">Open full calculator →</a>
        </div>

        <div className="calc-preview__grid">
          <div className="calc-preview__inputs">
            <div className="cp-row">
              <span className="cp-label">Vehicle</span>
              <span className="cp-value">{veh.year} {veh.make} {veh.model} {veh.trim}</span>
            </div>
            <div className="cp-row">
              <span className="cp-label">MSRP</span>
              <span className="cp-value mono">${veh.msrp.toLocaleString('en-CA')} <span className="c-faint">+ ${veh.freight.toLocaleString('en-CA')} freight</span></span>
            </div>
            <div className="cp-row">
              <span className="cp-label">Program</span>
              <span className="cp-value mono">{prog.rate.toFixed(2)}% / {prog.term}mo · residual {(prog.residual*100).toFixed(0)}%</span>
            </div>

            <div className="cp-control">
              <label className="cp-label">Province</label>
              <div className="cp-chips">
                {['AB','BC','ON','QC'].map(p => (
                  <button key={p} className={'chip' + (province===p?' chip--active':'')}
                          onClick={()=>setProvince(p)}>{p}</button>
                ))}
              </div>
            </div>

            <div className="cp-control">
              <label className="cp-label">Discount off MSRP <span className="c-faint mono">${discount.toLocaleString('en-CA')}</span></label>
              <input type="range" min="0" max="8000" step="100" value={discount}
                     onChange={e=>setDiscount(+e.target.value)} className="lw-slider"/>
            </div>
            <div className="cp-control">
              <label className="cp-label">Down payment <span className="c-faint mono">${down.toLocaleString('en-CA')}</span></label>
              <input type="range" min="0" max="10000" step="500" value={down}
                     onChange={e=>setDown(+e.target.value)} className="lw-slider"/>
            </div>
          </div>

          <CalcOutputCard out={out} province={province} term={prog.term} />
        </div>
      </div>
    </section>
  );
}

function CalcOutputCard({ out, province, term, big }) {
  return (
    <div className={'calc-out' + (big?' calc-out--big':'')}>
      <div className="calc-out__head">
        <span className="eyebrow">Monthly payment, {window.LW_DATA.provinces[province].name}</span>
        <span className="badge badge--ink mono">{term}mo</span>
      </div>
      <div className="calc-out__big">
        <span className="calc-out__cur mono">$</span>
        <span className="calc-out__num mono">{out.monthly.toFixed(0)}</span>
        <span className="calc-out__per mono">/mo</span>
      </div>
      <div className="calc-out__break">
        <Row label="Pre-tax monthly"     value={'$' + out.basePayment.toFixed(2)} />
        <Row label={'Tax (' + out.provLabel + ')'} value={'+ $' + out.tax.toFixed(2)} />
        <hr className="hr hr--soft" />
        <Row label="Total monthly (taxed)" value={'$' + out.monthly.toFixed(2)} bold />
        <Row label="Adj. cap cost" value={'$' + out.adjCap.toLocaleString('en-CA',{maximumFractionDigits:0})} />
        <Row label="Residual value"  value={'$' + out.residualValue.toLocaleString('en-CA',{maximumFractionDigits:0})} />
        <Row label="Money factor"    value={out.mf.toFixed(5)} />
        <Row label="Total cost of lease" value={'$' + out.totalLease.toLocaleString('en-CA',{maximumFractionDigits:0})} />
      </div>
      <div className="calc-out__context">
        Your payment-to-MSRP ratio is <span className="mono c-emerald">{(out.monthly / 624).toFixed(2)}%</span>.
        Canadian deals on this trim cluster at <span className="mono">1.18%</span> — you're below the median.
      </div>
    </div>
  );
}
function Row({ label, value, bold }) {
  return (
    <div className="calc-row">
      <span className="calc-row__l">{label}</span>
      <span className={'calc-row__v mono' + (bold?' calc-row__v--bold':'')}>{value}</span>
    </div>
  );
}

// ── Monthly programs snapshot ─────────────────────────────────────────
function ProgramsSnapshot() {
  const D = window.LW_DATA;
  return (
    <section className="programs">
      <div className="container">
        <div className="section-head section-head--row">
          <div>
            <span className="eyebrow">Programs · April 2026</span>
            <h2 className="t-h1">This month's captive lender rates.</h2>
          </div>
          <a className="btn btn--secondary" href="#">Full intel →</a>
        </div>
        <div className="programs__table-wrap">
          <table className="lw-table">
            <thead>
              <tr>
                <th>Brand</th>
                <th>Captive lender</th>
                <th>Headline trim</th>
                <th className="num">Term</th>
                <th className="num">Rate</th>
                <th className="num">Residual</th>
                <th className="num">Δ vs March</th>
                <th className="num">Expires</th>
              </tr>
            </thead>
            <tbody>
              {D.programs.map(p => (
                <tr key={p.brand}>
                  <td className="t-body" style={{fontWeight:600}}>{p.brand}</td>
                  <td className="c-muted t-body-s">{p.captive}</td>
                  <td className="mono t-body-s">{p.flagship}</td>
                  <td className="num mono">{p.term}</td>
                  <td className="num mono"><span style={{color: p.rate < 5 ? 'var(--emerald)' : 'inherit'}}>{p.rate.toFixed(2)}%</span></td>
                  <td className="num mono">{(p.residual*100).toFixed(0)}%</td>
                  <td className="num mono" style={{color: p.change < 0 ? 'var(--emerald)' : p.change > 0 ? 'var(--blood-orange)' : 'var(--text-muted)'}}>
                    {p.change === 0 ? '—' : (p.change > 0 ? '+' : '−') + Math.abs(p.change) + ' bp'}
                  </td>
                  <td className="num mono c-muted">{p.expires}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="programs__foot">
          <span className="source-chip">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 17H7A5 5 0 0 1 7 7h2M15 7h2a5 5 0 0 1 0 10h-2M8 12h8"/></svg>
            Source: brand offers pages · Updated Apr 28, 2026 · 4:32 PM MT
          </span>
        </div>
      </div>
    </section>
  );
}

// ── Community highlights ──────────────────────────────────────────────
function CommunityHighlights() {
  const D = window.LW_DATA;
  return (
    <section className="community">
      <div className="container">
        <div className="section-head section-head--row">
          <div>
            <span className="eyebrow">Community</span>
            <h2 className="t-h1">Recent threads worth reading.</h2>
          </div>
          <a className="btn btn--secondary" href="forum.html">Open forum →</a>
        </div>
        <div className="community__grid">
          {D.threads.slice(0,3).map(t => (
            <a key={t.id} href="forum.html" className="thread">
              <div className="thread__cat">
                <span className="badge">{t.cat}</span>
                <span className="badge badge--info">{t.province}</span>
                {t.solved && <span className="badge badge--positive">Solved</span>}
              </div>
              <div className="thread__title">{t.title}</div>
              <div className="thread__meta mono">
                {t.replies} replies · {t.views.toLocaleString('en-CA')} views · {t.last}
              </div>
              <div className="thread__op c-muted">— @{t.op}</div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── How it works ────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    { n:'1', title:'Research', body:'Open the calculator. Pick your vehicle, province, and lease structure. See the real payment with provincial tax baked in.' },
    { n:'2', title:'Negotiate', body:'Bring the payment-reverse target, the percentile rank, and the F&I decoder to the dealership. Quote money factor, not just APR.' },
    { n:'3', title:'Close — and share', body:'Post the deal back to the forum so the next Canadian negotiating the same trim has a reference point. The data compounds.' },
  ];
  return (
    <section className="how">
      <div className="container">
        <div className="section-head"><span className="eyebrow">Workflow</span><h2 className="t-h1">How LeaseWise fits into a real lease.</h2></div>
        <div className="how__grid">
          {steps.map(s => (
            <div className="how__step" key={s.n}>
              <div className="how__num mono">{s.n}</div>
              <div className="how__line" />
              <div className="how__title t-h3">{s.title}</div>
              <p className="how__body">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Sources strip ─────────────────────────────────────────────────────
function SourcesStrip() {
  const D = window.LW_DATA;
  return (
    <section className="sources">
      <div className="container">
        <div className="sources__head">
          <span className="eyebrow">Where our data comes from</span>
          <a href="sources.html" className="btn btn--ghost btn--sm">All sources →</a>
        </div>
        <div className="sources__grid">
          {D.sources.map((s,i) => (
            <div className="source-cell" key={i}>
              <span className="mono c-faint" style={{fontSize:11}}>0{i+1}</span>
              <span>{s}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── App ───────────────────────────────────────────────────────────────
function App() {
  const [theme, toggleTheme] = hTheme();
  return (
    <div className="lw-app">
      <HHeader active="" theme={theme} onToggleTheme={toggleTheme} />
      <main>
        <Hero />
        <WhatDealersKnow />
        <CalcPreview />
        <ProgramsSnapshot />
        <CommunityHighlights />
        <HowItWorks />
        <SourcesStrip />
      </main>
      <HFooter />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
