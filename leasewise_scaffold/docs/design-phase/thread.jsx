// Forum thread detail — desktop (~720px reading column on a 1280 viewport)
// /forum/thread/<slug> in production; for prototype, single thread.html
const { useState: useStateT } = React;
const { Header: TFHeader, Footer: TFFooter, useTheme: tfTheme } = window;

function ThreadApp() {
  const [theme, toggle] = tfTheme();
  const [reply, setReply] = useStateT('');

  const replies = [
    {
      u: 'ab_skeptic',
      ago: '3h ago',
      body: (
        <>92 DOL is real pressure but don't get cute. Counter at <span className="mono">$57,200</span> selling, hold the MF at .00166, and demand both loyalty AND conquest stacked. If they balk on conquest, walk — there's a similar X3 at Calgary BMW South sitting 78 days. Lowballing $2,400 below asking on a $62k car is the kind of thing that loses you the deal even when the dealer needs the unit gone.</>
      ),
      up: 41, isExpert: true,
    },
    {
      u: 'yyc_modhabitat',
      ago: '2h ago',
      body: (
        <>Bought my X3 30i at the same store last October at <span className="mono">$2,100</span> off MSRP at 47 DOL. They moved on selling price faster than I expected; the pushback was on aftermarket adds (paint protection, tire&amp;rim — both refundable, both declined). Worksheet ended up <span className="mono">$724/mo</span> AB taxed. Your asking is already aggressive — focus the negotiation on incentive stacking, not selling price.</>
      ),
      up: 28, isExpert: false,
    },
    {
      u: '604_driver',
      ago: '1h ago',
      body: (
        <>Counter-experience from BC: X3 30i, 88 DOL in Richmond, asked for the same lowball. Dealer let me walk. Came back two weeks later, car was still there, took it at <span className="mono">$57,400</span> with full conquest. The lesson: at 90+ DOL the dealer's pain is real but the salesperson's ego is also real. Don't insult the offer. Counter $57,200, walk if needed, expect to come back.</>
      ),
      up: 19, isExpert: false,
    },
    {
      u: 'mod_caryyc',
      ago: '38m ago',
      body: (
        <>Pinning this — combination of YYC-specific dealer lot data (92 DOL is verifiable on cars.com/AutoTrader) and reasonable counter logic. <strong>If you close, post the worksheet — anonymized — back here so the next person has a comp.</strong></>
      ),
      up: 12, isExpert: true, isMod: true,
    },
  ];

  return (
    <div className="lw-app">
      <TFHeader active="community" theme={theme} onToggleTheme={toggle} />
      <main id="main">
        <article className="thread-page">
          <div className="container thread-page__container">
            {/* Breadcrumb */}
            <nav className="thread-crumb">
              <a href="forum.html">Community</a>
              <span>/</span>
              <a href="forum.html#bavarian">Bavarian Lounge</a>
              <span>/</span>
              <span className="c-text">X3 30i Calgary</span>
            </nav>

            {/* Title block */}
            <header className="thread-head">
              <h1 className="thread-title">X3 30i Calgary — dealer holding 92 days, do I lowball?</h1>
              <div className="thread-tags">
                <span className="tag tag--brand">BMW</span>
                <span className="tag tag--prov">AB</span>
                <span className="tag">negotiation</span>
              </div>
              <div className="thread-meta">
                <span>by <strong className="c-text">yyc_lease</strong> · 4h ago</span>
                <span>67 replies · 1.4k views · last reply 12m ago</span>
              </div>
            </header>

            {/* Original post */}
            <section className="post post--op">
              <header className="post__head">
                <div className="post__author">
                  <span className="post__avatar" aria-hidden="true">YC</span>
                  <div>
                    <span className="post__name">yyc_lease <span className="tag tag--op">OP</span></span>
                    <span className="post__author-meta">Calgary, AB · 23 posts</span>
                  </div>
                </div>
                <span className="post__time">4h ago</span>
              </header>
              <div className="post__body">
                <p>Looking at a 2026 X3 xDrive30i at a Calgary dealer. Specifics:</p>
                <pre className="post__quote">
{`MSRP            $62,400
Asking          $58,900   (5.6% off)
Days on lot     92        ← long
Term · KM · MF  39 mo · 16k · .00166
Loyalty         $1,500    (current BMW)
Conquest        $1,500    (eligible)`}
                </pre>
                <p>At 92 days I'm thinking they want this off the lot. April subvented rate is 3.99% so MF is captive — no markup. Is it reasonable to counter at $56,500 selling + ask for an extra $500 conquest? Anyone done a similar deal in YYC this month?</p>
                <p>Calculator says I land around <span className="mono">$674/mo</span> AB taxed if they accept the counter. Currently at <span className="mono">$698</span>.</p>
              </div>
              <footer className="post__foot">
                <button className="post-action">↑ 23</button>
                <button className="post-action">Reply</button>
                <button className="post-action">Quote</button>
                <button className="post-action post-action--right">⋯</button>
              </footer>
            </section>

            {/* Replies */}
            <div className="thread-replies">
              {replies.map(r => (
                <section key={r.u} className="post">
                  <header className="post__head">
                    <div className="post__author">
                      <span className="post__avatar" aria-hidden="true">{r.u.slice(0, 2).toUpperCase()}</span>
                      <div>
                        <span className="post__name">
                          {r.u}
                          {r.isMod && <span className="tag tag--mod">MOD</span>}
                          {r.isExpert && !r.isMod && <span className="tag tag--expert">EXPERT</span>}
                        </span>
                        <span className="post__author-meta">{r.u === 'ab_skeptic' ? 'Edmonton, AB · 412 posts' : r.u === 'yyc_modhabitat' ? 'Calgary, AB · 138 posts' : r.u === '604_driver' ? 'Vancouver, BC · 89 posts' : 'Moderator · 2,047 posts'}</span>
                      </div>
                    </div>
                    <span className="post__time">{r.ago}</span>
                  </header>
                  <div className="post__body">{r.body}</div>
                  <footer className="post__foot">
                    <button className="post-action">↑ {r.up}</button>
                    <button className="post-action">Reply</button>
                    <button className="post-action">Quote</button>
                  </footer>
                </section>
              ))}

              {/* Composer */}
              <section className="thread-composer">
                <div className="thread-composer__head">
                  <span className="t-h3" style={{ margin: 0 }}>Add a reply</span>
                  <span className="c-muted t-body-s">Markdown supported · Be specific. Cite numbers.</span>
                </div>
                <textarea
                  className="thread-composer__textarea"
                  placeholder="Numbers > opinions. Share your own worksheet, your dealer's pushback, or what worked."
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                />
                <div className="thread-composer__foot">
                  <span className="c-muted t-body-s">Anonymous to other users · we strip dealer/PII before saving</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn--ghost btn--sm">Preview</button>
                    <button className="btn btn--accent btn--sm">Post reply</button>
                  </div>
                </div>
              </section>
            </div>
          </div>

          {/* Sidebar — sticky on desktop */}
          <aside className="thread-aside">
            <div className="card thread-side-card">
              <div className="eyebrow" style={{ marginBottom: 8 }}>Deal in question</div>
              <div className="thread-side-veh">2026 BMW X3 xDrive30i</div>
              <div className="thread-side-row"><span>MSRP</span><span className="mono">$62,400</span></div>
              <div className="thread-side-row"><span>Asking</span><span className="mono">$58,900</span></div>
              <div className="thread-side-row"><span>DOL</span><span className="mono c-bad">92</span></div>
              <div className="thread-side-row"><span>Term · MF</span><span className="mono">39mo · .00166</span></div>
              <div className="thread-side-row thread-side-row--total"><span>Asking $/mo</span><span className="mono">$698</span></div>
              <a className="btn btn--secondary btn--sm" style={{ marginTop: 12, width: '100%', justifyContent: 'center' }} href="calculator.html">Open in calculator →</a>
            </div>

            <div className="card thread-side-card">
              <div className="eyebrow" style={{ marginBottom: 8 }}>Comp set</div>
              <div className="t-body-s c-secondary" style={{ lineHeight: 1.55 }}>
                Same trim/term/province · Apr 2026 · n=12
              </div>
              <div className="thread-side-row" style={{ marginTop: 12 }}><span>Median</span><span className="mono">$724/mo</span></div>
              <div className="thread-side-row"><span>Top quartile</span><span className="mono">$691/mo</span></div>
              <div className="thread-side-row"><span>Best (90d)</span><span className="mono c-good">$684/mo</span></div>
            </div>

            <div className="card thread-side-card">
              <div className="eyebrow" style={{ marginBottom: 8 }}>Related</div>
              <a className="thread-side-link" href="brand.html">BMW brand guide →</a>
              <a className="thread-side-link" href="forum.html">Bavarian Lounge index →</a>
              <a className="thread-side-link" href="rater.html">Rate your worksheet →</a>
            </div>
          </aside>
        </article>
      </main>
      <TFFooter />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<ThreadApp />);
