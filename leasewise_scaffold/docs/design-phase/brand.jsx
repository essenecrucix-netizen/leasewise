// BMW brand page — full editorial brand guide (Round 4)
// Promoted from round3 BMWFullBrand. Uses semantic tokens so it cascades to
// light/dark themes, not hardcoded rgba(255,255,255,...).
const { Header: BHeader, Footer: BFooter, useTheme: bTheme } = window;

function BrandApp() {
  const [theme, toggle] = bTheme();

  // 18-month rate + residual history
  const history = [
    { m:'Nov 24', rate:6.49, res:0.54 }, { m:'Dec', rate:5.99, res:0.55 },
    { m:'Jan 25', rate:5.99, res:0.55 }, { m:'Feb', rate:5.49, res:0.55 },
    { m:'Mar', rate:5.49, res:0.56 }, { m:'Apr', rate:4.99, res:0.56 },
    { m:'May', rate:5.99, res:0.55 }, { m:'Jun', rate:5.49, res:0.55 },
    { m:'Jul', rate:5.49, res:0.56 }, { m:'Aug', rate:4.99, res:0.57 },
    { m:'Sep', rate:4.99, res:0.58 }, { m:'Oct', rate:4.49, res:0.58 },
    { m:'Nov', rate:4.49, res:0.59 }, { m:'Dec', rate:4.99, res:0.59 },
    { m:'Jan 26', rate:4.99, res:0.59 }, { m:'Feb', rate:4.49, res:0.59 },
    { m:'Mar', rate:4.49, res:0.59 }, { m:'Apr', rate:3.99, res:0.59 },
  ];

  const W = 1100, H = 280, padL = 60, padR = 60, padT = 32, padB = 48;
  const minR = 3.5, maxR = 6.8;
  const minRes = 0.52, maxRes = 0.62;
  const ix = i => padL + i * ((W - padL - padR) / (history.length - 1));
  const ratePts = history.map((h, i) => `${ix(i)},${padT + ((maxR - h.rate) / (maxR - minR)) * (H - padT - padB)}`).join(' ');
  const resPts  = history.map((h, i) => `${ix(i)},${padT + ((maxRes - h.res) / (maxRes - minRes)) * (H - padT - padB)}`).join(' ');

  // Deal benchmark distribution
  const benchmarks = [
    { range: '$640-680', count: 4, label: 'Top 10%' },
    { range: '$680-720', count: 8, label: '' },
    { range: '$720-760', count: 14, label: 'Median' },
    { range: '$760-800', count: 11, label: '' },
    { range: '$800-840', count: 6, label: '' },
    { range: '$840+',    count: 3, label: 'Bottom 10%' },
  ];
  const maxCount = Math.max(...benchmarks.map(b => b.count));

  // Monthly programs archive
  const archive = [
    { m: 'Apr 2026', rate: '3.99%', res: '59%', term: '39', incentive: '$1,500 loyalty + $1,500 conquest' },
    { m: 'Mar 2026', rate: '4.49%', res: '59%', term: '39', incentive: '$1,500 loyalty' },
    { m: 'Feb 2026', rate: '4.49%', res: '59%', term: '39', incentive: '$1,000 loyalty' },
    { m: 'Jan 2026', rate: '4.99%', res: '59%', term: '39', incentive: '$1,000 winter event' },
    { m: 'Dec 2025', rate: '4.99%', res: '59%', term: '39', incentive: '$2,000 year-end + loyalty' },
    { m: 'Nov 2025', rate: '4.49%', res: '59%', term: '39', incentive: '$1,500 loyalty' },
    { m: 'Oct 2025', rate: '4.49%', res: '58%', term: '39', incentive: '$1,500 loyalty' },
    { m: 'Sep 2025', rate: '4.99%', res: '58%', term: '39', incentive: '$1,000 conquest' },
  ];

  return (
    <div className="lw-app">
      <BHeader active="learn" theme={theme} onToggleTheme={toggle} />
      <main id="main">
        <div className="brand-full">
          {/* Breadcrumb */}
          <div className="container brand-crumb">
            <a href="index.html">Learn</a>
            <span>/</span>
            <a href="#">Brand guides</a>
            <span>/</span>
            <span className="c-text">BMW</span>
          </div>

          {/* ① HERO */}
          <section className="brand-section brand-section--hero">
            <div className="container">
              <div className="eyebrow" style={{ marginBottom: 24 }}>Brand guide · BMW Canada · April 2026</div>
              <div className="brand-hero">
                <div>
                  <h1 className="brand-wordmark">BMW.</h1>
                  <p className="t-body-l c-secondary" style={{ maxWidth: '52ch', margin: 0 }}>
                    BMW Financial Services posts subvented rates monthly, almost always on a 39-month term.
                    Loyalty cash stacks. Conquest cash stacks. <strong className="c-text" style={{ fontWeight: 500 }}>Money factor markup is the single biggest hidden cost.</strong>
                  </p>
                </div>
                <div className="brand-headline">
                  {[
                    ['Headline rate · X3 30i', '3.99%', '39 mo · 16k km · expires Apr 30', 'lime'],
                    ['Residual', '59%', '$36,816 at lease end'],
                    ['Loyalty / conquest', '$1,500', 'Stackable, current BMW or competitor'],
                    ['Median deal · Western CA', '$748/mo', 'n=31 · trailing 90d'],
                  ].map(([l, v, s, c]) => (
                    <div key={l} className="brand-stat">
                      <div className="brand-stat__lbl">{l}</div>
                      <div className="brand-stat__val" style={c === 'lime' ? { color: 'var(--lime-deep)' } : null}>{v}</div>
                      <div className="brand-stat__sub">{s}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ② CAPTIVE LENDER */}
          <section className="brand-section">
            <div className="container">
              <div className="eyebrow">Section 02</div>
              <h2 className="brand-h2">Captive lender — BMW Financial Services</h2>
              <div className="brand-2col">
                <p className="t-body-l c-secondary" style={{ margin: 0 }}>
                  BMW Canada's lease book runs through BMW Financial Services Canada Corp., headquartered in Markham. Programs reset on the 1st of each month and are typically published to dealers 3-5 days before.
                  The standard subvented term is 39 months with a graduated residual that creeps up by 1% every 6 months as the model year ages out. The acquisition fee is $675 across AB, ON, and BC; $725 in QC.
                  Money factor is published to dealers as the buy rate; markup is permitted up to 50 basis points (0.0005 in MF terms) and is the single largest source of hidden margin in a BMW lease.
                </p>
                <div className="brand-keyfacts">
                  {[
                    ['Term', '39 mo'],
                    ['Acquisition fee', '$675'],
                    ['Disposition fee', '$495'],
                    ['MF markup cap', '50 bps'],
                    ['KM standard', '16,000/yr'],
                    ['Wear allowance', '$2,500'],
                  ].map(([k, v]) => (
                    <div key={k} className="brand-keyfact">
                      <div className="brand-keyfact__l">{k}</div>
                      <div className="brand-keyfact__v">{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ③ HISTORICAL PROGRAM TRACKER */}
          <section className="brand-section">
            <div className="container">
              <div className="eyebrow">Section 03</div>
              <h2 className="brand-h2">18-month program history — X3 xDrive30i, 39 mo</h2>
              <p className="brand-lead">Subvented rate moves quarterly. Residuals creep up gradually as model year ages.</p>
              <div className="brand-legend">
                <span><span className="brand-legend__sw brand-legend__sw--rate" /> Headline rate (left)</span>
                <span><span className="brand-legend__sw brand-legend__sw--res" /> Residual (right)</span>
              </div>
              <div className="brand-chart-wrap">
                <svg viewBox={`0 0 ${W} ${H}`} className="brand-chart-svg" preserveAspectRatio="none">
                  {[4, 5, 6].map(r => {
                    const y = padT + ((maxR - r) / (maxR - minR)) * (H - padT - padB);
                    return (
                      <g key={`r${r}`}>
                        <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="var(--border-soft)" strokeDasharray="2 4" />
                        <text x={padL - 8} y={y + 4} fill="var(--text-muted)" fontSize="10" fontFamily="var(--font-mono)" textAnchor="end">{r}.0%</text>
                      </g>
                    );
                  })}
                  {[0.54, 0.57, 0.60].map(rs => {
                    const y = padT + ((maxRes - rs) / (maxRes - minRes)) * (H - padT - padB);
                    return <text key={`rs${rs}`} x={W - padR + 8} y={y + 4} fill="var(--text-muted)" fontSize="10" fontFamily="var(--font-mono)" textAnchor="start">{Math.round(rs * 100)}%</text>;
                  })}
                  <polyline points={resPts} fill="none" stroke="var(--text)" strokeOpacity="0.45" strokeWidth="1.5" strokeDasharray="3 3" />
                  <polyline points={ratePts} fill="none" stroke="var(--lime-deep)" strokeWidth="2.5" />
                  {history.map((h, i) => {
                    const x = ix(i);
                    const yR = padT + ((maxR - h.rate) / (maxR - minR)) * (H - padT - padB);
                    const isLast = i === history.length - 1;
                    return (
                      <g key={i}>
                        <circle cx={x} cy={yR} r={isLast ? 5 : 3} fill="var(--lime-deep)" />
                        {isLast && <text x={x} y={yR - 12} fill="var(--lime-deep)" fontSize="11" fontFamily="var(--font-mono)" textAnchor="middle" fontWeight="600">3.99%</text>}
                        {(i % 3 === 0 || isLast) && <text x={x} y={H - 16} fill="var(--text-muted)" fontSize="10" fontFamily="var(--font-mono)" textAnchor="middle">{h.m}</text>}
                      </g>
                    );
                  })}
                </svg>
              </div>
              <div className="brand-callout">
                <strong>Read:</strong> The April 2026 50-bps cut is the steepest single-month move in 18 months. Historically tied to Q2 push for inventory turn ahead of summer.
                The April rate is a tactical low — expect May to revert to ~4.49% unless inventory pressure persists.
              </div>
            </div>
          </section>

          {/* ④ NEGOTIATION PROFILE */}
          <section className="brand-section">
            <div className="container">
              <div className="eyebrow">Section 04</div>
              <h2 className="brand-h2">Negotiation profile</h2>
              <div className="brand-3col">
                <div className="brand-card">
                  <div className="brand-card__lbl brand-card__lbl--good">What works</div>
                  <p>Quote money factor, not APR. Always demand the buy rate in writing — BMW dealers respect the terminology and most will drop markup if you name it. Stack loyalty + conquest cash if you qualify for both. Negotiate at month-end, especially if days-on-lot is over 60.</p>
                </div>
                <div className="brand-card">
                  <div className="brand-card__lbl brand-card__lbl--bad">What doesn't</div>
                  <p>Asking for "lower payment" — that hides MF markup behind cap-cost moves. Putting cash down to fake a low payment (always a bad lease move). Taking 48 mo when 39 is the subvented term — 48 mo is rate-card and ~80 bps more expensive.</p>
                </div>
                <div className="brand-card">
                  <div className="brand-card__lbl">Dealer culture</div>
                  <p>BMW Canada dealers operate as a relatively tight network — your worksheet from one store will be checked at another. This works in your favour if you shop methodically, against you if you bluff. Calgary and Vancouver stores tend to be the most flexible on MF; Toronto stores hold firm but stack incentives more aggressively.</p>
                </div>
              </div>
            </div>
          </section>

          {/* ⑤ DEAL BENCHMARKS */}
          <section className="brand-section">
            <div className="container">
              <div className="eyebrow">Section 05</div>
              <h2 className="brand-h2">Deal benchmarks — X3 30i, last 90 days</h2>
              <p className="brand-lead">n=46 anonymized leases · Western Canada (AB/BC/SK) · all 39-month / 16k-km</p>
              <div className="brand-benchmark">
                <div className="brand-benchmark__bars">
                  {benchmarks.map((b, i) => {
                    const isMedian = b.label === 'Median';
                    const isTop = b.label === 'Top 10%';
                    return (
                      <div key={i} className="brand-benchmark__col">
                        <span className="brand-benchmark__count">{b.count}</span>
                        <div
                          className={'brand-benchmark__bar' + (isTop ? ' brand-benchmark__bar--top' : isMedian ? ' brand-benchmark__bar--median' : '')}
                          style={{ height: (b.count / maxCount) * 160 }}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="brand-benchmark__labels">
                  {benchmarks.map((b, i) => (
                    <div key={i} className="brand-benchmark__lbl">
                      <div className="brand-benchmark__range">{b.range}</div>
                      {b.label && <div className={'brand-benchmark__caption' + (b.label === 'Top 10%' ? ' brand-benchmark__caption--top' : '')}>{b.label}</div>}
                    </div>
                  ))}
                </div>
              </div>
              <div className="brand-keyfacts brand-keyfacts--4">
                {[['Sample size', '46 leases'], ['Median', '$748/mo'], ['Top 10% threshold', '$684/mo'], ['Spread P10→P90', '$184/mo']].map(([l, v]) => (
                  <div key={l} className="brand-keyfact">
                    <div className="brand-keyfact__l">{l}</div>
                    <div className="brand-keyfact__v">{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ⑥ F&I CONSIDERATIONS */}
          <section className="brand-section">
            <div className="container">
              <div className="eyebrow">Section 06</div>
              <h2 className="brand-h2">F&amp;I considerations</h2>
              <div className="brand-fi">
                {[
                  ['BMW Ultimate Care Plus', 'Refundable on most lease contracts within 30 days. Decline at signing — buy direct from the dealer at month 30 for 60-70% of F&I price if you want it.', 'decline'],
                  ['Tire & Wheel Insurance', 'Non-refundable once signed. BMW-specific premium ($895-1,200) — compare against pay-as-you-go from independent rim repair (typical Canadian fix is $250-400).', 'decline'],
                  ['Excess Wear Protection', 'Useful only if you historically exceed wear allowance. The $2,500 standard allowance covers most normal driving. Skip unless you have kids or pets in the car daily.', 'consider'],
                  ['BMW Lease Loyalty Pull-Ahead', 'Up to 6 months early — fee waived if you re-lease BMW. The pull-ahead window is the strongest negotiation moment in the BMW lifecycle.', 'use'],
                  ['Acquisition Fee Capitalization', 'BMW FS allows acquisition fee to be capitalized into the lease (paid monthly) rather than upfront. Math is identical, but cash flow can be useful.', 'use'],
                ].map(([t, d, k]) => (
                  <div key={t} className="brand-fi__row">
                    <div className="brand-fi__name">{t}</div>
                    <div className="brand-fi__desc">{d}</div>
                    <div className={'brand-fi__verdict brand-fi__verdict--' + k}>{k === 'decline' ? '→ decline' : k === 'use' ? '→ use' : '→ consider'}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ⑦ RECENT COMMUNITY DISCUSSIONS */}
          <section className="brand-section">
            <div className="container">
              <div className="eyebrow">Section 07</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                <h2 className="brand-h2" style={{ margin: 0 }}>Recent community discussions</h2>
                <a href="forum.html" className="t-body-s c-secondary">See all in Bavarian Lounge →</a>
              </div>
              <div className="brand-threads">
                {[
                  ['X3 30i Edmonton: 3.99/39 + $1,500 loyalty — pulled the trigger', 'AB', 'yegLeaser', 41, '1h ago', true],
                  ['BMW Q2 program leaked — X5 45e at 2.99%/60% on 36mo', 'ON', 'modhabitat', 142, '3h ago', false],
                  ['Calgary X3 — dealer holding 92 days, do I lowball?', 'AB', 'yyc_lease', 67, '6h ago', false],
                  ['Ultimate Care Plus refund timeline — anyone pushed past 30d?', 'BC', '604_driver', 23, 'yesterday', false],
                ].map(([title, prov, op, replies, ago, solved]) => (
                  <a key={title} href="thread.html" className="brand-thread">
                    <div className="brand-thread__tags">
                      <span className="tag tag--brand">BMW</span>
                      <span className="tag tag--prov">{prov}</span>
                      {solved && <span className="tag tag--solved">✓ solved</span>}
                    </div>
                    <div className="brand-thread__title">{title}</div>
                    <div className="brand-thread__meta">{op} · {replies} replies · {ago}</div>
                  </a>
                ))}
              </div>
            </div>
          </section>

          {/* ⑧ MONTHLY PROGRAMS ARCHIVE */}
          <section className="brand-section">
            <div className="container">
              <div className="eyebrow">Section 08</div>
              <h2 className="brand-h2">Monthly programs archive — X3 xDrive30i</h2>
              <div className="brand-archive-wrap">
                <table className="brand-archive">
                  <thead>
                    <tr>
                      {['Month', 'Headline rate', 'Residual', 'Term', 'Key incentive'].map(h => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {archive.map((row, i) => (
                      <tr key={row.m} className={i === 0 ? 'brand-archive__current' : ''}>
                        <td>
                          {row.m}
                          {i === 0 && <span className="tag tag--current">CURRENT</span>}
                        </td>
                        <td className="mono" style={i === 0 ? { color: 'var(--lime-deep)' } : null}>{row.rate}</td>
                        <td className="mono">{row.res}</td>
                        <td className="mono">{row.term} mo</td>
                        <td className="mono c-secondary" style={{ fontSize: 13 }}>{row.incentive}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="brand-archive-foot">
                Source: BMW Financial Services Canada dealer bulletins · cross-verified against community uploads · re-synced daily
              </div>
            </div>
          </section>
        </div>
      </main>
      <BFooter />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<BrandApp />);
