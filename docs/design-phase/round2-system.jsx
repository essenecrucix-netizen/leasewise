// round2-system.jsx — Sources page, Component states matrix,
// Iconography, Brand-mark variants, Empty/loading/error mockups,
// Light-mode renders, Round 2 Q&A.

const Frame = ({ children, w = 960, label, bg = 'var(--paper)', minH = 600 }) => (
  <div style={{padding:32, background:'var(--ink)', minHeight: minH+96, display:'flex', flexDirection:'column'}}>
    {label && <div style={{fontFamily:'var(--font-mono)', fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', marginBottom:16}}>{label}</div>}
    <div style={{width:w, margin:'0 auto', background:bg, borderRadius:8, overflow:'hidden', flex:1, display:'flex', flexDirection:'column'}}>{children}</div>
  </div>
);

// ─────────────────────────────────────────────────────────────────
// Sources / Transparency page
// ─────────────────────────────────────────────────────────────────
function SourcesPage() {
  const sources = [
    { name: 'Captive lender bulletins', meta: 'BMW FS · Honda Financial · Toyota Financial · MB Financial · Lexus Financial · Volvo Cars Financial', last: '2 hours ago', method: 'Direct partner feed + dealer-shared bulletins', confidence: 'high' },
    { name: 'Dealer worksheet uploads', meta: '1,247 anonymized leases · last 90 days', last: '11 minutes ago', method: 'Community uploads, OCR-parsed and verified by 3+ peers before scoring', confidence: 'high' },
    { name: 'Provincial tax rules', meta: 'GST/HST/PST/QST current rates · 13 jurisdictions', last: 'Mar 31, 2026', method: 'Canada Revenue Agency + provincial finance ministries', confidence: 'high' },
    { name: 'BC luxury surtax thresholds', meta: '$55k / $125k / $150k brackets', last: 'Apr 1, 2026', method: 'BC Ministry of Finance — PST Bulletin 308', confidence: 'high' },
    { name: 'Quebec QST registry treatment', meta: 'Lease tax base rules', last: 'Jan 1, 2026', method: 'Revenu Québec — IN-203-V', confidence: 'high' },
    { name: 'MSRP & freight figures', meta: '47 active programs · 8 brands', last: 'Daily', method: 'OEM Canada websites + manufacturer build-and-price', confidence: 'high' },
    { name: 'Days-on-lot signal', meta: 'Inventory aging via dealer feeds', last: '6 hours ago', method: 'Stellantis & Cox Automotive feeds (where available)', confidence: 'medium' },
    { name: 'Conquest / loyalty stackability', meta: 'Per-OEM stacking rules', last: 'Apr 14, 2026', method: 'Aggregated from dealer F&I disclosures + community confirmations', confidence: 'medium' },
  ];
  return (
    <Frame label="Sources · /sources" w={960} minH={920} bg="var(--paper)">
      {/* Header */}
      <div style={{padding:'56px 56px 32px', borderBottom:'1px solid var(--border-soft)'}}>
        <div style={{fontFamily:'var(--font-mono)', fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--text-muted)', marginBottom:12}}>Transparency · Apr 2026</div>
        <h1 style={{fontFamily:'var(--font-display)', fontSize:56, lineHeight:1.0, letterSpacing:'-0.025em', fontWeight:500, margin:0, color:'var(--ink)'}}>
          We show our sources.
        </h1>
        <p style={{fontSize:17, lineHeight:1.5, color:'var(--text-secondary)', margin:'20px 0 0', maxWidth:'62ch'}}>
          Every number on LeaseWise is traceable. Click a payment, see which captive program produced it. Click a percentile, see the comparable leases.
        </p>
      </div>

      {/* Live timestamps strip */}
      <div style={{padding:'20px 56px', background:'var(--ink)', color:'var(--paper)', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <div style={{display:'flex', gap:32}}>
          <div><div style={{fontSize:10, fontFamily:'var(--font-mono)', color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'0.08em'}}>Last sync</div><div style={{fontFamily:'var(--font-mono)', fontSize:13, marginTop:2, color:'var(--lime)'}}>● 11 min ago</div></div>
          <div><div style={{fontSize:10, fontFamily:'var(--font-mono)', color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'0.08em'}}>Datapoints</div><div style={{fontFamily:'var(--font-mono)', fontSize:13, marginTop:2}}>1,247 leases · 47 programs</div></div>
          <div><div style={{fontSize:10, fontFamily:'var(--font-mono)', color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'0.08em'}}>Coverage</div><div style={{fontFamily:'var(--font-mono)', fontSize:13, marginTop:2}}>13 provinces · 8 brands</div></div>
        </div>
        <button className="btn btn--accent" style={{height:32, padding:'0 14px', fontSize:12}}>API access</button>
      </div>

      {/* Sources table */}
      <div style={{padding:'40px 56px'}}>
        <table className="src-table">
          <thead>
            <tr>
              <th style={{width:'30%'}}>Source</th>
              <th style={{width:'35%'}}>Coverage</th>
              <th style={{width:'15%'}}>Method</th>
              <th style={{width:'10%'}}>Updated</th>
              <th style={{width:'10%'}}>Confidence</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((s,i) => (
              <tr key={i}>
                <td className="src-name">{s.name}</td>
                <td><span className="src-meta">{s.meta}</span></td>
                <td><span className="src-meta" style={{color:'var(--text-secondary)'}}>{s.method}</span></td>
                <td><span className="src-meta">{s.last}</span></td>
                <td>
                  <span className={`badge ${s.confidence==='high'?'badge--positive':'badge--caution'}`} style={{fontSize:10}}>
                    {s.confidence}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Methodology */}
      <div style={{padding:'0 56px 56px', display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:24}}>
        {[
          ['How percentiles work', 'Your deal is compared against the same trim, term length, KM/yr, and province. We need n≥30 to publish a percentile; below that we show "low confidence" and surface the raw comparables.'],
          ['Why trust a captive program?', 'OEM captive lenders publish base money factors and residuals to dealers monthly. We re-verify against three independent dealer-side feeds before showing a number.'],
          ['What we won\'t do', 'We don\'t publish dealer names attached to deals. We don\'t sell leads. We don\'t take advertising from manufacturers we publish programs for.'],
        ].map(([t,d]) => (
          <div key={t}>
            <div style={{fontFamily:'var(--font-display)', fontSize:16, fontWeight:600, marginBottom:8, color:'var(--ink)'}}>{t}</div>
            <p style={{fontSize:13, lineHeight:1.55, color:'var(--text-secondary)', margin:0}}>{d}</p>
          </div>
        ))}
      </div>
    </Frame>
  );
}

// ─────────────────────────────────────────────────────────────────
// Component states matrix
// ─────────────────────────────────────────────────────────────────
const StateRow = ({ label, children }) => (
  <div style={{display:'grid', gridTemplateColumns:'120px 1fr', gap:16, alignItems:'center', padding:'16px 0', borderBottom:'1px solid var(--border-soft)'}}>
    <div style={{fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em'}}>{label}</div>
    <div style={{display:'flex', gap:12, alignItems:'center', flexWrap:'wrap'}}>{children}</div>
  </div>
);

function ComponentStates() {
  return (
    <Frame label="Component states · /system/states" w={1080} minH={1100}>
      <div style={{padding:'40px 48px'}}>
        <div style={{fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8}}>Design system</div>
        <h2 style={{fontFamily:'var(--font-display)', fontSize:36, fontWeight:500, margin:0, letterSpacing:'-0.02em'}}>Component states</h2>
        <p style={{color:'var(--text-secondary)', margin:'8px 0 32px', maxWidth:'60ch'}}>
          Every interactive surface, every state. Default → hover → active → focus → disabled → loading.
        </p>

        {/* Buttons */}
        <h3 style={{fontFamily:'var(--font-display)', fontSize:18, fontWeight:600, margin:'8px 0 4px'}}>Buttons</h3>
        <StateRow label="Primary"><button className="btn btn--primary">Calculate</button><button className="btn btn--primary" style={{background:'#2A2A2A'}}>Hover</button><button className="btn btn--primary" style={{background:'#0A0A0A', transform:'scale(0.98)'}}>Active</button><button className="btn btn--primary" style={{boxShadow:'0 0 0 3px rgba(196,240,66,0.4)'}}>Focus</button><button className="btn btn--primary" style={{opacity:0.4, cursor:'not-allowed'}}>Disabled</button><button className="btn btn--primary"><span className="coc__skel" style={{width:60, height:12}}/></button></StateRow>
        <StateRow label="Accent"><button className="btn btn--accent">Save deal</button><button className="btn btn--accent" style={{background:'#B4E632'}}>Hover</button><button className="btn btn--accent" style={{background:'#A0D02E', transform:'scale(0.98)'}}>Active</button><button className="btn btn--accent" style={{boxShadow:'0 0 0 3px rgba(196,240,66,0.4)'}}>Focus</button><button className="btn btn--accent" style={{opacity:0.4, cursor:'not-allowed'}}>Disabled</button></StateRow>
        <StateRow label="Secondary"><button className="btn btn--secondary">Cancel</button><button className="btn btn--secondary" style={{background:'rgba(0,0,0,0.04)'}}>Hover</button><button className="btn btn--secondary" style={{background:'rgba(0,0,0,0.08)', transform:'scale(0.98)'}}>Active</button><button className="btn btn--secondary" style={{boxShadow:'0 0 0 3px rgba(196,240,66,0.4)'}}>Focus</button><button className="btn btn--secondary" style={{opacity:0.4, cursor:'not-allowed'}}>Disabled</button></StateRow>
        <StateRow label="Icon"><button className="btn-icon">↗</button><button className="btn-icon" style={{background:'var(--surface-inset)'}}>↗</button><button className="btn-icon" style={{boxShadow:'0 0 0 3px rgba(196,240,66,0.4)'}}>↗</button><button className="btn-icon" style={{opacity:0.4}}>↗</button></StateRow>

        {/* Inputs */}
        <h3 style={{fontFamily:'var(--font-display)', fontSize:18, fontWeight:600, margin:'32px 0 4px'}}>Inputs</h3>
        <StateRow label="Text input">
          <input type="text" placeholder="Selling price" style={{height:40, padding:'0 12px', border:'1px solid var(--border)', borderRadius:6, fontFamily:'var(--font-body)', fontSize:14, width:160}} />
          <input type="text" defaultValue="$58,900" style={{height:40, padding:'0 12px', border:'1px solid var(--text)', borderRadius:6, fontFamily:'var(--font-mono)', fontSize:14, width:160}} />
          <input type="text" defaultValue="$58,900" style={{height:40, padding:'0 12px', border:'1px solid var(--text)', boxShadow:'0 0 0 3px rgba(196,240,66,0.4)', borderRadius:6, fontFamily:'var(--font-mono)', fontSize:14, width:160}} />
          <input type="text" defaultValue="$X,XXX" style={{height:40, padding:'0 12px', border:'1px solid var(--blood-orange)', borderRadius:6, fontFamily:'var(--font-mono)', fontSize:14, width:160, color:'var(--blood-orange)'}} />
          <input type="text" defaultValue="$58,900" disabled style={{height:40, padding:'0 12px', border:'1px solid var(--border)', background:'var(--surface-inset)', borderRadius:6, fontFamily:'var(--font-mono)', fontSize:14, width:160, color:'var(--text-muted)'}} />
        </StateRow>
        <StateRow label="Select / chip">
          <span style={{padding:'8px 14px', border:'1px solid var(--border)', borderRadius:99, fontSize:13, background:'#fff'}}>Alberta ▾</span>
          <span style={{padding:'8px 14px', border:'1px solid var(--text)', borderRadius:99, fontSize:13, background:'var(--text)', color:'#fff'}}>Alberta ▾</span>
          <span style={{padding:'8px 14px', border:'1px solid var(--lime)', background:'rgba(196,240,66,0.15)', borderRadius:99, fontSize:13}}>+ Loyalty</span>
        </StateRow>

        {/* Badges */}
        <h3 style={{fontFamily:'var(--font-display)', fontSize:18, fontWeight:600, margin:'32px 0 4px'}}>Badges</h3>
        <StateRow label="Status">
          <span className="badge badge--positive">P84 · A</span>
          <span className="badge badge--caution">P38 · D</span>
          <span className="badge badge--negative">Markup</span>
          <span className="badge badge--info">Apr 2026</span>
          <span className="badge badge--lime">Captive base</span>
          <span className="badge badge--ink">Verified</span>
        </StateRow>

        {/* Cards */}
        <h3 style={{fontFamily:'var(--font-display)', fontSize:18, fontWeight:600, margin:'32px 0 4px'}}>Status surfaces</h3>
        <StateRow label="Status card">
          <div className="status-card status-card--positive" style={{maxWidth:240, fontSize:12}}>
            <strong style={{display:'block', fontSize:13}}>MF at captive base</strong>
            <span style={{color:'var(--text-muted)'}}>0.00166 = 3.99% APR</span>
          </div>
          <div className="status-card status-card--caution" style={{maxWidth:240, fontSize:12}}>
            <strong style={{display:'block', fontSize:13}}>Doc fee high for ON</strong>
            <span style={{color:'var(--text-muted)'}}>$799 vs. avg $499</span>
          </div>
          <div className="status-card status-card--negative" style={{maxWidth:240, fontSize:12}}>
            <strong style={{display:'block', fontSize:13}}>MF marked up 80 bps</strong>
            <span style={{color:'var(--text-muted)'}}>0.00275 vs. base 0.00250</span>
          </div>
        </StateRow>

        {/* Toasts */}
        <StateRow label="Toast">
          <div className="toast toast--success">✓ Deal saved to your library</div>
          <div className="toast toast--error">⚠ Couldn't reach BMW FS — using cached</div>
        </StateRow>

        {/* Modal */}
        <StateRow label="Modal">
          <div className="modal" style={{width:360, fontSize:13}}>
            <h3>Share anonymously?</h3>
            <p style={{color:'var(--text-muted)', margin:'0 0 16px'}}>We'll strip your name, dealer name, VIN, and rate-quote sheet ID. The numbers and grade post to /community.</p>
            <div style={{display:'flex', gap:8, justifyContent:'flex-end'}}>
              <button className="btn btn--secondary" style={{height:36, fontSize:13}}>Cancel</button>
              <button className="btn btn--accent" style={{height:36, fontSize:13}}>Share</button>
            </div>
          </div>
        </StateRow>
      </div>
    </Frame>
  );
}

// ─────────────────────────────────────────────────────────────────
// Iconography
// ─────────────────────────────────────────────────────────────────
const ICONS = [
  ['calc', 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM7 7h10v3H7zM7 13h2v2H7zM11 13h2v2h-2zM15 13h2v6h-2zM7 17h2v2H7zM11 17h2v2h-2z'],
  ['rate', 'M12 2l2.5 6.5L21 9l-5 4.5L17.5 21 12 17.5 6.5 21 8 13.5 3 9l6.5-.5z'],
  ['vehicle', 'M5 11l1.5-4a2 2 0 0 1 1.9-1.4h7.2a2 2 0 0 1 1.9 1.4L19 11M5 11h14M5 11v6m14-6v6M7 17h2m6 0h2'],
  ['program', 'M3 6h18M3 12h18M3 18h12'],
  ['province', 'M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z'],
  ['source', 'M4 4h12l4 4v12H4zM16 4v4h4M8 12h8M8 16h8'],
  ['captive', 'M3 21h18M5 21V10l7-5 7 5v11M9 21v-7h6v7'],
  ['discount', 'M3 12l9-9 9 9-9 9zM12 8v4M12 16h.01'],
  ['kmYear', 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM12 8v4l3 2'],
  ['residual', 'M3 12c0-5 4-9 9-9s9 4 9 9-4 9-9 9-9-4-9-9zM3 12h18'],
  ['mf', 'M4 4h16v16H4zM8 8h8M8 12h8M8 16h4'],
  ['percentile', 'M3 21l4-4 5 5 9-9M14 8h7v7'],
  ['flag', 'M5 21V4M5 4h14l-3 4 3 4H5'],
  ['anonymized', 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0M9 4l6 6'],
  ['verified', 'M5 13l4 4L19 7'],
  ['expiring', 'M12 6v6l4 2M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z'],
];

function IconographyPage() {
  return (
    <Frame label="Iconography · /system/icons" w={1080} minH={680}>
      <div style={{padding:'40px 48px'}}>
        <div style={{fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8}}>Design system</div>
        <h2 style={{fontFamily:'var(--font-display)', fontSize:36, fontWeight:500, margin:0, letterSpacing:'-0.02em'}}>Iconography</h2>
        <p style={{color:'var(--text-secondary)', margin:'8px 0 12px', maxWidth:'58ch'}}>
          Domain-specific 24×24 line icons. 1.6px stroke, square caps, rounded joins. No filled glyphs.
        </p>

        {/* Specs */}
        <div style={{display:'flex', gap:32, marginBottom:32, fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text-muted)'}}>
          <div><span style={{color:'var(--text)'}}>24×24</span> · base grid</div>
          <div><span style={{color:'var(--text)'}}>1.6px</span> · stroke</div>
          <div><span style={{color:'var(--text)'}}>2px</span> · padding</div>
          <div><span style={{color:'var(--text)'}}>currentColor</span> · all fills</div>
        </div>

        <div className="icon-grid-r2" style={{gridTemplateColumns:'repeat(8, 1fr)'}}>
          {ICONS.map(([name, d]) => (
            <div className="icon-cell" key={name}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d={d} />
              </svg>
              <span>{name}</span>
            </div>
          ))}
        </div>

        {/* Sizes */}
        <h3 style={{fontFamily:'var(--font-display)', fontSize:16, fontWeight:600, margin:'32px 0 12px'}}>Sizes</h3>
        <div style={{display:'flex', alignItems:'flex-end', gap:24, padding:'16px 24px', background:'var(--surface-inset)', borderRadius:8}}>
          {[16, 20, 24, 32, 48].map(s => (
            <div key={s} style={{display:'flex', flexDirection:'column', alignItems:'center', gap:6}}>
              <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d={ICONS[0][1]} />
              </svg>
              <span style={{fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-muted)'}}>{s}px</span>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

// ─────────────────────────────────────────────────────────────────
// Brand-mark variants (lime dot only, clearspace, min size, prohibited)
// ─────────────────────────────────────────────────────────────────
function LWMark({ size = 48, color = 'var(--ink)', dot = 'var(--lime)' }) {
  return (
    <span style={{fontFamily:'var(--font-display)', fontSize:size, fontWeight:600, letterSpacing:'-0.025em', color, lineHeight:1}}>
      LeaseWise<span style={{color:dot}}>.</span>
    </span>
  );
}

function BrandMarks() {
  return (
    <Frame label="Logo system · /system/logo" w={1080} minH={1100}>
      <div style={{padding:'40px 48px'}}>
        <div style={{fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8}}>Brand · logo</div>
        <h2 style={{fontFamily:'var(--font-display)', fontSize:36, fontWeight:500, margin:0, letterSpacing:'-0.02em'}}>Logo system</h2>
        <p style={{color:'var(--text-secondary)', margin:'8px 0 32px', maxWidth:'58ch'}}>
          One mark, three contexts. The lime dot is the only accent permitted. Always present, never replaced.
        </p>

        {/* Variants */}
        <h3 style={{fontFamily:'var(--font-display)', fontSize:16, fontWeight:600, margin:'0 0 16px'}}>Variants</h3>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:0, border:'1px solid var(--border-soft)', borderRadius:8, overflow:'hidden', marginBottom:32}}>
          <div style={{padding:'48px 32px', background:'#fff', borderRight:'1px solid var(--border-soft)', display:'flex', flexDirection:'column', gap:8}}>
            <LWMark size={36} />
            <span style={{fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em'}}>Primary · light</span>
            <span style={{fontSize:11, color:'var(--text-muted)'}}>Use for headers, footers, light surfaces.</span>
          </div>
          <div style={{padding:'48px 32px', background:'var(--ink)', borderRight:'1px solid var(--border-soft)', display:'flex', flexDirection:'column', gap:8}}>
            <LWMark size={36} color="var(--paper)" />
            <span style={{fontFamily:'var(--font-mono)', fontSize:10, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'0.08em'}}>Primary · dark</span>
            <span style={{fontSize:11, color:'rgba(255,255,255,0.5)'}}>Used everywhere on the dark site.</span>
          </div>
          <div style={{padding:'48px 32px', background:'var(--paper)', display:'flex', flexDirection:'column', gap:8}}>
            <LWMark size={36} color="var(--ink)" dot="var(--ink)" />
            <span style={{fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em'}}>Single-ink · print</span>
            <span style={{fontSize:11, color:'var(--text-muted)'}}>For invoices, embossed swag, single-color print.</span>
          </div>
        </div>

        {/* Clearspace */}
        <h3 style={{fontFamily:'var(--font-display)', fontSize:16, fontWeight:600, margin:'0 0 16px'}}>Clearspace</h3>
        <div style={{padding:'48px', background:'var(--surface-inset)', borderRadius:8, position:'relative', marginBottom:32}}>
          {/* clearspace markers */}
          <div style={{position:'relative', display:'inline-block'}}>
            <span style={{position:'absolute', top:-30, left:0, right:0, height:24, borderTop:'1px solid var(--text-muted)', borderLeft:'1px solid var(--text-muted)', borderRight:'1px solid var(--text-muted)'}}></span>
            <span style={{position:'absolute', top:-26, left:'50%', transform:'translateX(-50%)', fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-muted)', background:'var(--surface-inset)', padding:'0 6px'}}>= cap-height of "L"</span>
            <span style={{position:'absolute', bottom:-30, left:0, right:0, height:24, borderBottom:'1px solid var(--text-muted)', borderLeft:'1px solid var(--text-muted)', borderRight:'1px solid var(--text-muted)'}}></span>
            <div style={{padding:'24px 24px'}}><LWMark size={36} /></div>
          </div>
          <p style={{margin:'48px 0 0', fontSize:13, color:'var(--text-secondary)', maxWidth:'56ch'}}>
            Maintain at least 1× cap-height of clear space on every side. The dot counts toward the wordmark — measure clearspace from its right edge.
          </p>
        </div>

        {/* Minimum size */}
        <h3 style={{fontFamily:'var(--font-display)', fontSize:16, fontWeight:600, margin:'0 0 16px'}}>Minimum size</h3>
        <div style={{display:'flex', alignItems:'flex-end', gap:32, padding:'24px', background:'var(--surface-inset)', borderRadius:8, marginBottom:32}}>
          <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:8}}>
            <LWMark size={64} />
            <span style={{fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-muted)'}}>64px · web header</span>
          </div>
          <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:8}}>
            <LWMark size={28} />
            <span style={{fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-muted)'}}>28px · mobile</span>
          </div>
          <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:8}}>
            <LWMark size={20} />
            <span style={{fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-muted)'}}>20px · favicon source</span>
          </div>
          <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:8, opacity:0.4}}>
            <LWMark size={14} />
            <span style={{fontFamily:'var(--font-mono)', fontSize:10, color:'var(--blood-orange)'}}>14px · prohibited</span>
          </div>
          <p style={{margin:'0 0 0 auto', fontSize:13, color:'var(--text-secondary)', maxWidth:'30ch', alignSelf:'center'}}>
            Don't go below 20px. Below that the lime dot is unreadable on most displays.
          </p>
        </div>

        {/* Prohibited */}
        <h3 style={{fontFamily:'var(--font-display)', fontSize:16, fontWeight:600, margin:'0 0 16px'}}>Prohibited</h3>
        <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:16}}>
          {[
            ['Don\'t recolor the wordmark', <span style={{fontFamily:'var(--font-display)', fontSize:24, fontWeight:600, color:'var(--blood-orange)'}}>LeaseWise<span style={{color:'var(--lime)'}}>.</span></span>],
            ['Don\'t replace the dot', <span style={{fontFamily:'var(--font-display)', fontSize:24, fontWeight:600, color:'var(--ink)'}}>LeaseWise<span style={{color:'var(--ink)'}}>!</span></span>],
            ['Don\'t add a strapline lockup', <div><span style={{fontFamily:'var(--font-display)', fontSize:20, fontWeight:600}}>LeaseWise<span style={{color:'var(--lime)'}}>.</span></span><div style={{fontSize:9, color:'var(--text-muted)', marginTop:2}}>by Acme Auto</div></div>],
            ['Don\'t outline or stroke', <span style={{fontFamily:'var(--font-display)', fontSize:24, fontWeight:600, color:'transparent', WebkitTextStroke:'1px var(--ink)'}}>LeaseWise<span style={{WebkitTextStroke:'1px var(--lime)', color:'transparent'}}>.</span></span>],
          ].map(([txt, demo]) => (
            <div key={txt} style={{padding:'24px 16px', border:'1px solid var(--border-soft)', borderRadius:8, position:'relative', textAlign:'center'}}>
              <div style={{position:'absolute', top:8, right:8, width:20, height:20, borderRadius:'50%', background:'var(--blood-orange)', color:'#fff', fontSize:13, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:600}}>×</div>
              <div style={{padding:'24px 0', display:'flex', justifyContent:'center', alignItems:'center', minHeight:80}}>{demo}</div>
              <div style={{fontSize:11, color:'var(--text-muted)', marginTop:4}}>{txt}</div>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

// ─────────────────────────────────────────────────────────────────
// Round 2 design responses (open questions)
// ─────────────────────────────────────────────────────────────────
function R2Responses() {
  const qs = [
    { q: 'How prominent is "anonymous community" on the homepage?', a: 'Currently a tertiary section below programs. We propose elevating it to a peer of "Active programs" — same size cards, different visual treatment (typewriter type, no avatars). The trust signal is reading 6 deals in 20 seconds, not the section header.', design: 'See: round2.html → "Homepage refinements" — Community module promoted above the fold on /, secondary on tools pages.' },
    { q: 'Should the Reverse calculator be a tab or a separate page?', a: 'Tab. Two reasons: (1) reverse is the same math, just inverted — separating it implies a different tool. (2) The most common reverse use case is "I have a payment quote, what\'s the actual MF?" — that\'s a sanity-check on Forward, not a standalone task.', design: 'Implemented in calculator.jsx as Forward / Reverse segmented control above the input form.' },
    { q: 'What\'s the editorial voice for community-content (forum threads, deal stories)?', a: 'Direct, slightly dry, never breathless. Threads read like a Slack channel of insiders, not a Reddit hype thread. No "🔥" "🚨" "MUST-READ". Numbers and acronyms are fine — "MF .00166 / 59% RV / $0 down" is more credible than "Amazing deal!"', design: 'See forum.html — thread titles are factual, comments use monospace for figures.' },
    { q: 'Light mode — is it required or optional?', a: 'Optional but tested. The product is dark-default because most of the high-stakes work (calculator, rater, brand pages) happens at dealer-time-of-day (evening). Light mode is for sharing screenshots, printing worksheets, accessibility. We provide it as a toggle, not the default.', design: 'See round2.html → "Light mode" section for homepage and calculator.' },
    { q: 'How do we surface "stale data" without undermining trust?', a: 'Three signals, in order of prominence: (1) the live-sync indicator in the header strip (always visible), (2) per-program "as of" timestamps on hover, (3) the Stale state of the calc output card (shown when a program has expired). We never silently serve old data — if it\'s expired, the UI says so.', design: 'See COCStale state. Header timestamp is in chrome.jsx already.' },
    { q: 'Should we publish dealer names attached to deals?', a: 'No. We publish: vehicle, trim, term, KM/yr, province, the deal grade, and the date. We don\'t publish: dealer name, salesperson, customer name, VIN. This is non-negotiable for legal exposure and community trust. Dealers can opt-in to a verified channel separately.', design: 'See sources page → "What we won\'t do" callout.' },
  ];
  return (
    <Frame label="Round 2 · open questions" w={960} minH={1080}>
      <div style={{padding:'48px 56px'}}>
        <div style={{fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8}}>Round 2 · responses</div>
        <h2 style={{fontFamily:'var(--font-display)', fontSize:36, fontWeight:500, margin:0, letterSpacing:'-0.02em'}}>Six open questions, with design responses.</h2>

        <div style={{marginTop:40, display:'flex', flexDirection:'column', gap:32}}>
          {qs.map((item, i) => (
            <div key={i} style={{display:'grid', gridTemplateColumns:'40px 1fr', gap:16}}>
              <div style={{fontFamily:'var(--font-mono)', fontSize:13, color:'var(--text-muted)', paddingTop:2}}>{String(i+1).padStart(2,'0')}</div>
              <div>
                <h3 style={{fontFamily:'var(--font-display)', fontSize:18, fontWeight:600, margin:'0 0 10px', lineHeight:1.3, color:'var(--ink)'}}>{item.q}</h3>
                <p style={{fontSize:14, lineHeight:1.55, color:'var(--text-secondary)', margin:'0 0 10px'}}>{item.a}</p>
                <div style={{padding:'10px 14px', background:'var(--surface-inset)', borderLeft:'3px solid var(--lime)', borderRadius:'0 4px 4px 0', fontSize:12, lineHeight:1.5, fontFamily:'var(--font-mono)', color:'var(--text-secondary)'}}>
                  → {item.design}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

// ─────────────────────────────────────────────────────────────────
// Light-mode renders
// ─────────────────────────────────────────────────────────────────
function LightHomepage() {
  return (
    <Frame label="Light mode · homepage hero" w={1280} minH={760} bg="var(--paper)">
      <div data-theme="light" style={{padding:'56px 64px', flex:1, display:'flex', flexDirection:'column'}}>
        {/* Header */}
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', paddingBottom:32, borderBottom:'1px solid var(--border-soft)'}}>
          <LWMark size={28} />
          <div style={{display:'flex', gap:24, fontSize:14, color:'var(--text-secondary)'}}>
            <span style={{color:'var(--ink)', fontWeight:500}}>Programs</span>
            <span>Calculator</span>
            <span>Deal Rater</span>
            <span>Community</span>
            <span>Sources</span>
          </div>
          <button className="btn btn--accent" style={{height:36}}>Sign in</button>
        </div>

        {/* Ticker */}
        <div style={{display:'flex', gap:0, padding:'14px 0', borderBottom:'1px solid var(--border-soft)', overflow:'hidden', fontFamily:'var(--font-mono)', fontSize:12}}>
          {[
            ['BMW X3 30i · ON', '$748', '↑'],
            ['RX 350 · ON', '$682', '↓'],
            ['CR-V Hyb · QC', '$524', '↓'],
            ['GLC 300 · BC', '$948', '↑'],
            ['IONIQ 5 · AB', '$542', '↓'],
          ].map((t,i) => (
            <span key={i} style={{padding:'0 24px', borderRight: i<4?'1px solid var(--border-soft)':'none', whiteSpace:'nowrap'}}>
              <span style={{color:'var(--text-muted)'}}>{t[0]}</span>{' '}
              <span style={{color:'var(--ink)'}}>{t[1]}</span>{' '}
              <span style={{color: t[2]==='↑'?'var(--blood-orange)':'var(--emerald)'}}>{t[2]}</span>
            </span>
          ))}
        </div>

        {/* Hero */}
        <div style={{padding:'72px 0 48px', display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:64, alignItems:'center', flex:1}}>
          <div>
            <div style={{fontFamily:'var(--font-mono)', fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--text-muted)', marginBottom:16}}>April 2026 · Western Canada · 1,247 active leases</div>
            <h1 style={{fontFamily:'var(--font-display)', fontSize:80, lineHeight:0.95, letterSpacing:'-0.03em', fontWeight:500, margin:0, color:'var(--ink)'}}>
              Know what dealers know.
            </h1>
            <p style={{fontSize:18, lineHeight:1.5, color:'var(--text-secondary)', margin:'24px 0 32px', maxWidth:'42ch'}}>
              The Canadian leasing knowledge base. Real numbers, real people. We show our sources.
            </p>
            <div style={{display:'flex', gap:12}}>
              <button className="btn btn--primary" style={{height:48, padding:'0 24px', fontSize:15}}>Calculate a payment</button>
              <button className="btn btn--secondary" style={{height:48, padding:'0 24px', fontSize:15}}>Rate my worksheet</button>
            </div>
          </div>
          <div style={{padding:24, background:'#fff', border:'1px solid var(--border-soft)', borderRadius:12, boxShadow:'var(--shadow-elevated)'}}>
            <div style={{fontFamily:'var(--font-mono)', fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--text-muted)', display:'flex', justifyContent:'space-between', marginBottom:14}}>
              <span>Featured · audit</span>
              <span style={{color:'var(--emerald)'}}>● live</span>
            </div>
            <div style={{fontFamily:'var(--font-display)', fontSize:48, fontWeight:500, letterSpacing:'-0.025em', lineHeight:1, color:'var(--ink)'}}>$698<span style={{fontSize:16, fontFamily:'var(--font-mono)', color:'var(--text-muted)', marginLeft:6, fontWeight:400}}>/mo · taxed</span></div>
            <div style={{fontSize:13, color:'var(--text-secondary)', margin:'10px 0 14px'}}>2026 BMW X3 xDrive30i · 39 mo · AB</div>
            <div style={{padding:'10px 12px', borderRadius:6, background:'rgba(29,158,117,0.08)', color:'var(--emerald)', fontFamily:'var(--font-mono)', fontSize:11, display:'flex', justifyContent:'space-between'}}>
              <span>Better than 84% of Apr deals</span>
              <span>P84 · A</span>
            </div>
            <div style={{marginTop:14, padding:'12px 0 0', borderTop:'1px solid var(--border-soft)', fontSize:11, color:'var(--text-muted)', fontFamily:'var(--font-mono)', display:'flex', justifyContent:'space-between'}}>
              <span>n=412 comparable leases</span>
              <span>see math →</span>
            </div>
          </div>
        </div>
      </div>
    </Frame>
  );
}

function LightCalculator() {
  return (
    <Frame label="Light mode · calculator" w={1280} minH={720} bg="var(--paper)">
      <div data-theme="light" style={{padding:'48px 64px', flex:1, display:'flex', flexDirection:'column'}}>
        <div style={{fontFamily:'var(--font-mono)', fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--text-muted)', marginBottom:8}}>Tool · /tools/calculator</div>
        <h1 style={{fontFamily:'var(--font-display)', fontSize:40, lineHeight:1.05, letterSpacing:'-0.02em', fontWeight:500, margin:'0 0 8px', color:'var(--ink)'}}>Calculate the payment.</h1>
        <p style={{fontSize:15, color:'var(--text-secondary)', margin:'0 0 32px', maxWidth:'62ch'}}>Real captive-lender programs. Real provincial tax math. No "starting at."</p>

        {/* Tab */}
        <div style={{display:'flex', borderBottom:'1px solid var(--border-soft)', marginBottom:24}}>
          <span style={{padding:'12px 0', marginRight:32, fontSize:14, fontWeight:500, color:'var(--ink)', borderBottom:'2px solid var(--ink)'}}>Forward</span>
          <span style={{padding:'12px 0', fontSize:14, color:'var(--text-muted)'}}>Reverse</span>
        </div>

        <div style={{display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:32, flex:1}}>
          {/* Form */}
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
            {[
              ['Vehicle', '2026 BMW X3 xDrive30i', 'Apr 2026 program · BMW FS'],
              ['Province', 'Alberta', 'GST 5%'],
              ['Term', '39 months', '3.99% APR · 59% RV'],
              ['Annual KM', '16,000', null],
              ['Selling price', '$58,900', 'MSRP $62,400'],
              ['Down payment', '$0', null],
              ['Trade equity', '$0', null],
              ['Loyalty', '$1,500', 'BMW conquest+loyalty'],
            ].map(([l,v,h]) => (
              <div key={l} style={{padding:'14px 16px', background:'#fff', border:'1px solid var(--border)', borderRadius:8}}>
                <div style={{fontSize:10, fontFamily:'var(--font-mono)', textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-muted)'}}>{l}</div>
                <div style={{fontSize:15, marginTop:6, color:'var(--ink)', fontFamily: l==='Vehicle'?'var(--font-body)':'var(--font-mono)', fontWeight: l==='Vehicle'?500:400}}>{v}</div>
                {h && <div style={{fontSize:11, fontFamily:'var(--font-mono)', color:'var(--text-muted)', marginTop:4}}>{h}</div>}
              </div>
            ))}
          </div>

          {/* Output card */}
          <div className="coc" style={{background:'#fff', borderColor:'var(--border)', width:'auto'}}>
            <div className="coc__eyebrow" style={{color:'var(--text-muted)'}}>
              <span>Estimated payment</span>
              <span style={{color:'var(--emerald)'}}>● live · BMW Apr 2026</span>
            </div>
            <div className="coc__pay" style={{color:'var(--ink)'}}>$698<sub style={{color:'var(--text-muted)'}}>/mo · taxed in AB</sub></div>
            <div className="coc__pctile" style={{background:'rgba(29,158,117,0.10)', color:'var(--emerald)'}}>
              <span>Better than 84% of Apr deals (n=412)</span>
              <span>P84</span>
            </div>
            <div className="coc__break">
              <div className="coc__row" style={{borderColor:'var(--border-soft)'}}><span className="coc__row-l" style={{color:'var(--text-muted)'}}>Base monthly</span><span className="coc__row-v" style={{color:'var(--ink)'}}>$664.76</span></div>
              <div className="coc__row" style={{borderColor:'var(--border-soft)'}}><span className="coc__row-l" style={{color:'var(--text-muted)'}}>+ GST 5%</span><span className="coc__row-v" style={{color:'var(--ink)'}}>$33.24</span></div>
              <div className="coc__row coc__row--total" style={{borderColor:'var(--border-soft)'}}><span className="coc__row-l" style={{color:'var(--ink)'}}>Monthly (taxed)</span><span className="coc__row-v" style={{color:'var(--ink)'}}>$698.00</span></div>
            </div>
          </div>
        </div>
      </div>
    </Frame>
  );
}

Object.assign(window, {
  SourcesPage, ComponentStates, IconographyPage, BrandMarks,
  R2Responses, LightHomepage, LightCalculator,
});
