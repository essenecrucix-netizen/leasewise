// Sources / Transparency page — full route
const { Header: SHeader, Footer: SFooter, useTheme: sTheme } = window;

function SourcesApp() {
  const [theme, toggle] = sTheme();
  const sources = [
    { name: 'Captive lender bulletins', meta: 'BMW FS · Honda Financial · Toyota Financial · MB Financial · Lexus Financial · Volvo Cars Financial', last: '2h ago', method: 'Direct partner feed + dealer-shared bulletins', confidence: 'high' },
    { name: 'Dealer worksheet uploads', meta: '1,247 anonymized leases · last 90 days', last: '11m ago', method: 'Community uploads, OCR-parsed and verified by 3+ peers before scoring', confidence: 'high' },
    { name: 'Provincial tax rules', meta: 'GST/HST/PST/QST current rates · 13 jurisdictions', last: 'Mar 31, 2026', method: 'Canada Revenue Agency + provincial finance ministries', confidence: 'high' },
    { name: 'BC luxury surtax thresholds', meta: '$55k / $125k / $150k brackets', last: 'Apr 1, 2026', method: 'BC Ministry of Finance — PST Bulletin 308', confidence: 'high' },
    { name: 'Quebec QST registry treatment', meta: 'Lease tax base rules', last: 'Jan 1, 2026', method: 'Revenu Québec — IN-203-V', confidence: 'high' },
    { name: 'MSRP & freight figures', meta: '47 active programs · 8 brands', last: 'Daily', method: 'OEM Canada websites + manufacturer build-and-price', confidence: 'high' },
    { name: 'Days-on-lot signal', meta: 'Inventory aging via dealer feeds', last: '6h ago', method: 'Stellantis & Cox Automotive feeds (where available)', confidence: 'medium' },
    { name: 'Conquest / loyalty stackability', meta: 'Per-OEM stacking rules', last: 'Apr 14, 2026', method: 'Aggregated from dealer F&I disclosures + community confirmations', confidence: 'medium' },
  ];

  return (
    <div className="lw-app">
      <SHeader theme={theme} onToggleTheme={toggle} />
      <main id="main">
        {/* Hero */}
        <section className="src-hero">
          <div className="container">
            <div className="eyebrow">Transparency · Apr 2026</div>
            <h1 className="src-hero__title">We show our sources.</h1>
            <p className="src-hero__sub">
              Every number on LeaseWise is traceable. Click a payment, see which captive program produced it. Click a percentile, see the comparable leases.
            </p>
          </div>
        </section>

        {/* Live strip */}
        <section className="src-livestrip">
          <div className="container">
            <div className="src-livestrip__inner">
              <div className="src-livestat">
                <div className="src-livestat__label">Last sync</div>
                <div className="src-livestat__val src-livestat__val--lime">● 11 min ago</div>
              </div>
              <div className="src-livestat">
                <div className="src-livestat__label">Datapoints</div>
                <div className="src-livestat__val">1,247 leases · 47 programs</div>
              </div>
              <div className="src-livestat">
                <div className="src-livestat__label">Coverage</div>
                <div className="src-livestat__val">13 provinces · 8 brands</div>
              </div>
              <div className="src-livestat">
                <div className="src-livestat__label">Independence</div>
                <div className="src-livestat__val">No paid placement</div>
              </div>
              <a className="btn btn--accent btn--sm" href="#api">API access →</a>
            </div>
          </div>
        </section>

        {/* Table */}
        <section className="src-table-section">
          <div className="container">
            <div className="src-table-section__head">
              <span className="eyebrow">All sources · n=8</span>
              <span className="t-body-s c-muted">Sorted by last update</span>
            </div>
            <table className="src-table src-table--page">
              <thead>
                <tr>
                  <th style={{ width: '24%' }}>Source</th>
                  <th style={{ width: '30%' }}>Coverage</th>
                  <th style={{ width: '28%' }}>Method</th>
                  <th style={{ width: '8%' }}>Updated</th>
                  <th style={{ width: '10%' }}>Confidence</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((s, i) => (
                  <tr key={i}>
                    <td className="src-name">{s.name}</td>
                    <td><span className="src-meta">{s.meta}</span></td>
                    <td><span className="src-meta" style={{ color: 'var(--text-secondary)' }}>{s.method}</span></td>
                    <td><span className="src-meta mono">{s.last}</span></td>
                    <td>
                      <span className={`badge ${s.confidence === 'high' ? 'badge--positive' : 'badge--caution'}`} style={{ fontSize: 10 }}>
                        {s.confidence}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Methodology */}
        <section className="src-method">
          <div className="container">
            <h2 className="t-h2" style={{ marginBottom: 24 }}>Methodology</h2>
            <div className="src-method__grid">
              {[
                ['How percentiles work', 'Your deal is compared against the same trim, term length, KM/yr, and province. We need n≥30 to publish a percentile; below that we show "low confidence" and surface the raw comparables.'],
                ['Why trust a captive program?', 'OEM captive lenders publish base money factors and residuals to dealers monthly. We re-verify against three independent dealer-side feeds before showing a number.'],
                ["What we won't do", "We don't publish dealer names attached to deals. We don't sell leads. We don't take advertising from manufacturers we publish programs for."],
                ['When we publish a deal grade', 'A grade requires (1) verified worksheet, (2) ≥30 comparables in the same segment/term/province, (3) program data <30 days old. Grades stale-out automatically when a new captive program ships.'],
                ['How we handle disputes', 'If a lender or OEM disputes a number, we publish their statement next to ours within 48 hours and re-verify. To date: 4 disputes, 1 correction (Volvo MF, Feb 2026 — fixed in 36 minutes).'],
                ['Open data, where possible', 'Provincial tax rules, MSRP, freight, and luxury surtax brackets are public — we publish CSV exports of our normalized tables. Captive programs are partner-restricted; we publish the math, not the rate sheet.'],
              ].map(([t, d]) => (
                <div className="src-method__cell" key={t}>
                  <div className="src-method__title">{t}</div>
                  <p className="src-method__body">{d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Independence pledge */}
        <section className="src-pledge">
          <div className="container">
            <div className="src-pledge__card">
              <div className="src-pledge__eyebrow eyebrow">Independence pledge</div>
              <p className="src-pledge__body">
                LeaseWise does not take advertising from any manufacturer, dealer group, or lender whose programs appear on this site. We do not sell leads. We do not run paid placement. Sponsored listings are <strong>prohibited</strong> by our charter and disclosed inline if that ever changes.
              </p>
              <div className="src-pledge__row">
                <div>
                  <div className="src-pledge__stat">$0</div>
                  <div className="src-pledge__stat-label">Manufacturer ad revenue, 2025</div>
                </div>
                <div>
                  <div className="src-pledge__stat">100%</div>
                  <div className="src-pledge__stat-label">Subscription &amp; community revenue</div>
                </div>
                <div>
                  <div className="src-pledge__stat">0</div>
                  <div className="src-pledge__stat-label">Dealer leads sold or referred</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* API */}
        <section className="src-api" id="api">
          <div className="container">
            <div className="src-api__grid">
              <div>
                <div className="eyebrow">Developers</div>
                <h2 className="t-h2" style={{ margin: '12px 0 16px' }}>API access for journalists, researchers, and tools.</h2>
                <p className="t-body" style={{ color: 'var(--text-secondary)', maxWidth: '52ch', margin: 0 }}>
                  Read-only access to our normalized program, tax, and aggregate-deal tables. Free for journalists and academic research. Rate-limited tier free for individual developers; pro tier for tooling vendors.
                </p>
              </div>
              <pre className="src-api__code">
{`curl https://api.leasewise.ca/v1/programs \\
  -H "X-API-Key: $LW_KEY" \\
  -G --data-urlencode "make=BMW" \\
       --data-urlencode "province=AB"

# 200 OK
{
  "program_id": "bmw-x3-30i-2026-04",
  "vehicle":    "2026 X3 xDrive30i",
  "term":       39,
  "km_year":    16000,
  "money_factor": 0.00166,
  "residual_pct": 0.61,
  "as_of":      "2026-04-15",
  "confidence": "high",
  "n_verified": 47
}`}
              </pre>
            </div>
          </div>
        </section>
      </main>
      <SFooter />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<SourcesApp />);
