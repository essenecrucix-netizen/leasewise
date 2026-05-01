// round3.jsx — Round 3 polish deliverables
// Item 2: Full BMW brand page (7 sections + history chart)
// Item 3: Mobile forum thread detail (375px)

const R3Frame = ({ children, w = 1280, label, bg = 'var(--ink)', minH = 600, dark = true }) => (
  <div style={{padding:24, background:'var(--ink)', minHeight: minH+72, display:'flex', flexDirection:'column'}}>
    {label && <div style={{fontFamily:'var(--font-mono)', fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', marginBottom:12}}>{label}</div>}
    <div data-theme={dark?'dark':'light'} style={{width:w, margin:'0 auto', background:bg, borderRadius:8, overflow:'hidden', flex:1, color: dark?'var(--paper)':'var(--ink)'}}>{children}</div>
  </div>
);

// ── BMW Full Brand Page ──────────────────────────────────────────────
function BMWFullBrand() {
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

  // Deal benchmark distribution (X3 30i, last 90d, Western Canada)
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
    <R3Frame label="BMW Canada · full brand page · /brands/bmw" w={1280} minH={3400}>
      {/* Header chrome */}
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'20px 56px', borderBottom:'1px solid rgba(255,255,255,0.08)'}}>
        <span style={{fontFamily:'var(--font-display)', fontSize:20, fontWeight:600, letterSpacing:'-0.02em'}}>LeaseWise<span style={{color:'var(--lime)'}}>.</span></span>
        <div style={{display:'flex', gap:24, fontSize:13, color:'rgba(255,255,255,0.7)'}}>
          <span>Programs</span><span>Calculator</span><span>Deal Rater</span><span style={{color:'#fff', fontWeight:500}}>Brand guides</span><span>Community</span>
        </div>
        <span style={{fontFamily:'var(--font-mono)', fontSize:11, color:'rgba(255,255,255,0.5)'}}>● synced 11m ago</span>
      </div>

      {/* Breadcrumb */}
      <div style={{padding:'20px 56px 0', fontFamily:'var(--font-mono)', fontSize:11, color:'rgba(255,255,255,0.5)', letterSpacing:'0.04em'}}>
        <span>Learn</span> <span style={{margin:'0 8px'}}>/</span> <span>Brand guides</span> <span style={{margin:'0 8px'}}>/</span> <span style={{color:'#fff'}}>BMW</span>
      </div>

      {/* ① HERO */}
      <div style={{padding:'48px 56px 64px', display:'grid', gridTemplateColumns:'1.3fr 1fr', gap:64, borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
        <div>
          <div style={{fontFamily:'var(--font-mono)', fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', color:'rgba(255,255,255,0.5)', marginBottom:24}}>Brand guide · BMW Canada · April 2026</div>
          <h1 style={{fontFamily:'var(--font-display)', fontSize:160, lineHeight:0.9, letterSpacing:'-0.04em', fontWeight:500, margin:'0 0 32px', color:'#fff'}}>BMW.</h1>
          <p style={{fontSize:18, lineHeight:1.55, color:'rgba(255,255,255,0.85)', margin:0, maxWidth:'52ch'}}>
            BMW Financial Services posts subvented rates monthly, almost always on a 39-month term.
            Loyalty cash stacks. Conquest cash stacks. <strong style={{color:'#fff', fontWeight:500}}>Money factor markup is the single biggest hidden cost.</strong>
          </p>
        </div>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:1, background:'rgba(255,255,255,0.06)', alignSelf:'end'}}>
          {[
            ['Headline rate · X3 30i', '3.99%', '39 mo · 16k km · expires Apr 30', 'lime'],
            ['Residual', '59%', '$36,816 at lease end'],
            ['Loyalty / conquest', '$1,500', 'Stackable, current BMW or competitor'],
            ['Median deal · Western CA', '$748/mo', 'n=31 · trailing 90d'],
          ].map(([l,v,s,c]) => (
            <div key={l} style={{padding:'24px 24px', background:'var(--ink)'}}>
              <div style={{fontFamily:'var(--font-mono)', fontSize:10, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'0.06em'}}>{l}</div>
              <div style={{fontFamily:'var(--font-display)', fontSize:36, fontWeight:500, letterSpacing:'-0.02em', margin:'8px 0 6px', color: c==='lime'?'var(--lime)':'#fff'}}>{v}</div>
              <div style={{fontSize:11, color:'rgba(255,255,255,0.5)', fontFamily:'var(--font-mono)'}}>{s}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ② CAPTIVE LENDER */}
      <div style={{padding:'56px 56px', borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
        <div style={{fontFamily:'var(--font-mono)', fontSize:11, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8}}>Section 02</div>
        <h2 style={{fontFamily:'var(--font-display)', fontSize:40, fontWeight:500, letterSpacing:'-0.02em', margin:'0 0 28px', color:'#fff'}}>Captive lender — BMW Financial Services</h2>
        <div style={{display:'grid', gridTemplateColumns:'1.6fr 1fr', gap:48}}>
          <p style={{fontSize:17, lineHeight:1.6, color:'rgba(255,255,255,0.85)', margin:0}}>
            BMW Canada's lease book runs through BMW Financial Services Canada Corp., headquartered in Markham. Programs reset on the 1st of each month and are typically published to dealers 3-5 days before.
            The standard subvented term is 39 months with a graduated residual that creeps up by 1% every 6 months as the model year ages out. The acquisition fee is $675 across AB, ON, and BC; $725 in QC.
            Money factor is published to dealers as the buy rate; markup is permitted up to 50 basis points (0.0005 in MF terms) and is the single largest source of hidden margin in a BMW lease.
          </p>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:1, background:'rgba(255,255,255,0.06)'}}>
            {[
              ['Term', '39 mo'],
              ['Acquisition fee', '$675'],
              ['Disposition fee', '$495'],
              ['MF markup cap', '50 bps'],
              ['KM standard', '16,000/yr'],
              ['Wear allowance', '$2,500'],
            ].map(([k,v]) => (
              <div key={k} style={{padding:'14px 16px', background:'var(--ink)'}}>
                <div style={{fontFamily:'var(--font-mono)', fontSize:10, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'0.06em'}}>{k}</div>
                <div style={{fontFamily:'var(--font-mono)', fontSize:15, color:'#fff', marginTop:4}}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ③ HISTORICAL PROGRAM TRACKER */}
      <div style={{padding:'56px 56px', borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
        <div style={{fontFamily:'var(--font-mono)', fontSize:11, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8}}>Section 03</div>
        <h2 style={{fontFamily:'var(--font-display)', fontSize:40, fontWeight:500, letterSpacing:'-0.02em', margin:'0 0 8px', color:'#fff'}}>18-month program history — X3 xDrive30i, 39 mo</h2>
        <p style={{fontSize:14, color:'rgba(255,255,255,0.6)', margin:'0 0 32px', maxWidth:'62ch'}}>Subvented rate moves quarterly. Residuals creep up gradually as model year ages.</p>
        <div style={{display:'flex', gap:24, marginBottom:16, fontFamily:'var(--font-mono)', fontSize:11}}>
          <span style={{display:'flex', alignItems:'center', gap:6}}><span style={{display:'inline-block', width:10, height:2, background:'var(--lime)'}}></span><span style={{color:'rgba(255,255,255,0.7)'}}>Headline rate (left)</span></span>
          <span style={{display:'flex', alignItems:'center', gap:6}}><span style={{display:'inline-block', width:10, height:2, background:'#FAFAF6', opacity:0.45}}></span><span style={{color:'rgba(255,255,255,0.7)'}}>Residual (right)</span></span>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%', height:280}} preserveAspectRatio="none">
          {/* rate gridlines (left axis) */}
          {[4, 5, 6].map(r => {
            const y = padT + ((maxR - r) / (maxR - minR)) * (H - padT - padB);
            return (
              <g key={`r${r}`}>
                <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="rgba(255,255,255,0.08)" strokeDasharray="2 4" />
                <text x={padL - 8} y={y + 4} fill="rgba(255,255,255,0.5)" fontSize="10" fontFamily="var(--font-mono)" textAnchor="end">{r}.0%</text>
              </g>
            );
          })}
          {/* residual ticks (right axis) */}
          {[0.54, 0.57, 0.60].map(rs => {
            const y = padT + ((maxRes - rs) / (maxRes - minRes)) * (H - padT - padB);
            return <text key={`rs${rs}`} x={W - padR + 8} y={y + 4} fill="rgba(255,255,255,0.45)" fontSize="10" fontFamily="var(--font-mono)" textAnchor="start">{Math.round(rs * 100)}%</text>;
          })}
          {/* residual line */}
          <polyline points={resPts} fill="none" stroke="#FAFAF6" strokeOpacity="0.45" strokeWidth="1.5" strokeDasharray="3 3" />
          {/* rate line */}
          <polyline points={ratePts} fill="none" stroke="var(--lime)" strokeWidth="2.5" />
          {history.map((h, i) => {
            const x = ix(i);
            const yR = padT + ((maxR - h.rate) / (maxR - minR)) * (H - padT - padB);
            const isLast = i === history.length - 1;
            return (
              <g key={i}>
                <circle cx={x} cy={yR} r={isLast ? 5 : 3} fill="var(--lime)" />
                {isLast && <text x={x} y={yR - 12} fill="var(--lime)" fontSize="11" fontFamily="var(--font-mono)" textAnchor="middle" fontWeight="600">3.99%</text>}
                {(i % 3 === 0 || isLast) && <text x={x} y={H - 16} fill="rgba(255,255,255,0.6)" fontSize="10" fontFamily="var(--font-mono)" textAnchor="middle">{h.m}</text>}
              </g>
            );
          })}
        </svg>
        <div style={{marginTop:24, padding:'16px 20px', borderLeft:'2px solid rgba(255,255,255,0.15)', fontSize:13, lineHeight:1.55, color:'rgba(255,255,255,0.7)', maxWidth:'72ch'}}>
          <strong style={{color:'#fff', fontWeight:500}}>Read:</strong> The April 2026 50-bps cut is the steepest single-month move in 18 months. Historically tied to Q2 push for inventory turn ahead of summer.
          The April rate is a tactical low — expect May to revert to ~4.49% unless inventory pressure persists.
        </div>
      </div>

      {/* ④ NEGOTIATION PROFILE */}
      <div style={{padding:'56px 56px', borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
        <div style={{fontFamily:'var(--font-mono)', fontSize:11, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8}}>Section 04</div>
        <h2 style={{fontFamily:'var(--font-display)', fontSize:40, fontWeight:500, letterSpacing:'-0.02em', margin:'0 0 28px', color:'#fff'}}>Negotiation profile</h2>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:24}}>
          <div style={{padding:24, background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:8}}>
            <div style={{fontFamily:'var(--font-mono)', fontSize:10, color:'var(--lime)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12}}>What works</div>
            <p style={{fontSize:14, lineHeight:1.6, color:'rgba(255,255,255,0.85)', margin:0}}>
              Quote money factor, not APR. Always demand the buy rate in writing — BMW dealers respect the terminology and most will drop markup if you name it. Stack loyalty + conquest cash if you qualify for both. Negotiate at month-end, especially if days-on-lot is over 60.
            </p>
          </div>
          <div style={{padding:24, background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:8}}>
            <div style={{fontFamily:'var(--font-mono)', fontSize:10, color:'var(--blood-orange)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12}}>What doesn't</div>
            <p style={{fontSize:14, lineHeight:1.6, color:'rgba(255,255,255,0.85)', margin:0}}>
              Asking for "lower payment" — that hides MF markup behind cap-cost moves. Putting cash down to fake a low payment (always a bad lease move). Taking 48 mo when 39 is the subvented term — 48 mo is rate-card and ~80 bps more expensive.
            </p>
          </div>
          <div style={{padding:24, background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:8}}>
            <div style={{fontFamily:'var(--font-mono)', fontSize:10, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12}}>Dealer culture</div>
            <p style={{fontSize:14, lineHeight:1.6, color:'rgba(255,255,255,0.85)', margin:0}}>
              BMW Canada dealers operate as a relatively tight network — your worksheet from one store will be checked at another. This works in your favour if you shop methodically, against you if you bluff. Calgary and Vancouver stores tend to be the most flexible on MF; Toronto stores hold firm but stack incentives more aggressively.
            </p>
          </div>
        </div>
      </div>

      {/* ⑤ DEAL BENCHMARKS */}
      <div style={{padding:'56px 56px', borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
        <div style={{fontFamily:'var(--font-mono)', fontSize:11, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8}}>Section 05</div>
        <h2 style={{fontFamily:'var(--font-display)', fontSize:40, fontWeight:500, letterSpacing:'-0.02em', margin:'0 0 8px', color:'#fff'}}>Deal benchmarks — X3 30i, last 90 days</h2>
        <p style={{fontSize:14, color:'rgba(255,255,255,0.6)', margin:'0 0 32px'}}>n=46 anonymized leases · Western Canada (AB/BC/SK) · all 39-month / 16k-km</p>
        <div style={{display:'flex', alignItems:'flex-end', gap:8, height:200, padding:'0 0 8px', borderBottom:'1px solid rgba(255,255,255,0.12)'}}>
          {benchmarks.map((b, i) => {
            const isMedian = b.label === 'Median';
            const isTop = b.label === 'Top 10%';
            return (
              <div key={i} style={{flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:8}}>
                <span style={{fontFamily:'var(--font-mono)', fontSize:11, color:'#fff'}}>{b.count}</span>
                <div style={{width:'100%', height: (b.count / maxCount) * 160, background: isTop ? 'var(--lime)' : isMedian ? '#FAFAF6' : 'rgba(255,255,255,0.25)', borderRadius:'2px 2px 0 0'}}></div>
              </div>
            );
          })}
        </div>
        <div style={{display:'flex', gap:8, marginTop:8}}>
          {benchmarks.map((b,i) => (
            <div key={i} style={{flex:1, textAlign:'center'}}>
              <div style={{fontFamily:'var(--font-mono)', fontSize:11, color:'rgba(255,255,255,0.7)'}}>{b.range}</div>
              {b.label && <div style={{fontFamily:'var(--font-mono)', fontSize:10, color: b.label==='Top 10%'?'var(--lime)':'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'0.06em', marginTop:2}}>{b.label}</div>}
            </div>
          ))}
        </div>
        <div style={{marginTop:24, display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:1, background:'rgba(255,255,255,0.06)'}}>
          {[['Sample size','46 leases'],['Median','$748/mo'],['Top 10% threshold','$684/mo'],['Spread P10→P90','$184/mo']].map(([l,v]) => (
            <div key={l} style={{padding:'14px 16px', background:'var(--ink)'}}>
              <div style={{fontFamily:'var(--font-mono)', fontSize:10, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'0.06em'}}>{l}</div>
              <div style={{fontFamily:'var(--font-mono)', fontSize:15, color:'#fff', marginTop:4}}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ⑥ F&I CONSIDERATIONS */}
      <div style={{padding:'56px 56px', borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
        <div style={{fontFamily:'var(--font-mono)', fontSize:11, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8}}>Section 06</div>
        <h2 style={{fontFamily:'var(--font-display)', fontSize:40, fontWeight:500, letterSpacing:'-0.02em', margin:'0 0 28px', color:'#fff'}}>F&amp;I considerations</h2>
        <div style={{display:'flex', flexDirection:'column'}}>
          {[
            ['BMW Ultimate Care Plus', 'Refundable on most lease contracts within 30 days. Decline at signing — buy direct from the dealer at month 30 for 60-70% of F&I price if you want it.', 'decline'],
            ['Tire & Wheel Insurance', 'Non-refundable once signed. BMW-specific premium ($895-1,200) — compare against pay-as-you-go from independent rim repair (typical Canadian fix is $250-400).', 'decline'],
            ['Excess Wear Protection', 'Useful only if you historically exceed wear allowance. The $2,500 standard allowance covers most normal driving. Skip unless you have kids or pets in the car daily.', 'consider'],
            ['BMW Lease Loyalty Pull-Ahead', 'Up to 6 months early — fee waived if you re-lease BMW. The pull-ahead window is the strongest negotiation moment in the BMW lifecycle.', 'use'],
            ['Acquisition Fee Capitalization', 'BMW FS allows acquisition fee to be capitalized into the lease (paid monthly) rather than upfront. Math is identical, but cash flow can be useful.', 'use'],
          ].map(([t, d, k]) => (
            <div key={t} style={{display:'grid', gridTemplateColumns:'180px 1fr 100px', gap:24, padding:'18px 0', borderBottom:'1px solid rgba(255,255,255,0.06)', alignItems:'start'}}>
              <div style={{fontSize:14, fontWeight:500, color:'#fff'}}>{t}</div>
              <div style={{fontSize:13, lineHeight:1.55, color:'rgba(255,255,255,0.7)'}}>{d}</div>
              <div style={{fontFamily:'var(--font-mono)', fontSize:10, textTransform:'uppercase', letterSpacing:'0.08em', color: k==='decline'?'var(--blood-orange)':k==='use'?'var(--lime)':'var(--amber)', textAlign:'right'}}>{k==='decline'?'→ decline':k==='use'?'→ use':'→ consider'}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ⑦ RECENT COMMUNITY DISCUSSIONS */}
      <div style={{padding:'56px 56px', borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
        <div style={{fontFamily:'var(--font-mono)', fontSize:11, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8}}>Section 07</div>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:24}}>
          <h2 style={{fontFamily:'var(--font-display)', fontSize:40, fontWeight:500, letterSpacing:'-0.02em', margin:0, color:'#fff'}}>Recent community discussions</h2>
          <a style={{fontSize:13, color:'rgba(255,255,255,0.6)'}}>See all in Bavarian Lounge →</a>
        </div>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:1, background:'rgba(255,255,255,0.06)'}}>
          {[
            ['X3 30i Edmonton: 3.99/39 + $1,500 loyalty — pulled the trigger', 'AB', 'yegLeaser', 41, '1h ago', true],
            ['BMW Q2 program leaked — X5 45e at 2.99%/60% on 36mo', 'ON', 'modhabitat', 142, '3h ago', false],
            ['Calgary X3 — dealer holding 92 days, do I lowball?', 'AB', 'yyc_lease', 67, '6h ago', false],
            ['Ultimate Care Plus refund timeline — anyone pushed past 30d?', 'BC', '604_driver', 23, 'yesterday', false],
          ].map(([title, prov, op, replies, ago, solved]) => (
            <a key={title} style={{padding:24, background:'var(--ink)', cursor:'pointer'}}>
              <div style={{display:'flex', gap:6, marginBottom:10, alignItems:'center'}}>
                <span style={{padding:'2px 6px', background:'rgba(255,255,255,0.08)', borderRadius:3, fontFamily:'var(--font-mono)', fontSize:10, color:'rgba(255,255,255,0.7)', textTransform:'uppercase'}}>BMW</span>
                <span style={{padding:'2px 6px', background:'rgba(196,240,66,0.10)', color:'var(--lime)', borderRadius:3, fontFamily:'var(--font-mono)', fontSize:10}}>{prov}</span>
                {solved && <span style={{padding:'2px 6px', background:'rgba(29,158,117,0.15)', color:'var(--emerald)', borderRadius:3, fontFamily:'var(--font-mono)', fontSize:10}}>✓ solved</span>}
              </div>
              <div style={{fontSize:15, lineHeight:1.4, color:'#fff', marginBottom:10, fontWeight:500}}>{title}</div>
              <div style={{fontFamily:'var(--font-mono)', fontSize:11, color:'rgba(255,255,255,0.5)'}}>{op} · {replies} replies · {ago}</div>
            </a>
          ))}
        </div>
      </div>

      {/* ⑧ MONTHLY PROGRAMS ARCHIVE */}
      <div style={{padding:'56px 56px'}}>
        <div style={{fontFamily:'var(--font-mono)', fontSize:11, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8}}>Section 08</div>
        <h2 style={{fontFamily:'var(--font-display)', fontSize:40, fontWeight:500, letterSpacing:'-0.02em', margin:'0 0 24px', color:'#fff'}}>Monthly programs archive — X3 xDrive30i</h2>
        <table style={{width:'100%', borderCollapse:'collapse', fontSize:14}}>
          <thead>
            <tr style={{borderBottom:'1px solid rgba(255,255,255,0.12)'}}>
              {['Month', 'Headline rate', 'Residual', 'Term', 'Key incentive'].map(h => (
                <th key={h} style={{textAlign:'left', padding:'14px 16px 10px', fontFamily:'var(--font-mono)', fontSize:10, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:500}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {archive.map((row, i) => (
              <tr key={row.m} style={{borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                <td style={{padding:'14px 16px', color: i===0?'#fff':'rgba(255,255,255,0.85)', fontWeight: i===0?500:400}}>
                  {row.m}{i===0 && <span style={{marginLeft:8, padding:'2px 6px', background:'var(--lime)', color:'var(--ink)', fontSize:10, borderRadius:3, fontFamily:'var(--font-mono)', fontWeight:600}}>CURRENT</span>}
                </td>
                <td style={{padding:'14px 16px', fontFamily:'var(--font-mono)', color: i===0?'var(--lime)':'rgba(255,255,255,0.85)'}}>{row.rate}</td>
                <td style={{padding:'14px 16px', fontFamily:'var(--font-mono)', color:'rgba(255,255,255,0.85)'}}>{row.res}</td>
                <td style={{padding:'14px 16px', fontFamily:'var(--font-mono)', color:'rgba(255,255,255,0.85)'}}>{row.term} mo</td>
                <td style={{padding:'14px 16px', fontFamily:'var(--font-mono)', fontSize:13, color:'rgba(255,255,255,0.7)'}}>{row.incentive}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{marginTop:24, fontSize:11, color:'rgba(255,255,255,0.4)', fontFamily:'var(--font-mono)'}}>
          Source: BMW Financial Services Canada dealer bulletins · cross-verified against community uploads · re-synced daily
        </div>
      </div>

      {/* Footer marker */}
      <div style={{padding:'24px 56px', borderTop:'1px solid rgba(255,255,255,0.08)', fontFamily:'var(--font-mono)', fontSize:11, color:'rgba(255,255,255,0.4)', display:'flex', justifyContent:'space-between'}}>
        <span>/brands/bmw · last sync 11m ago</span>
        <span>BMW · Mercedes-Benz · Audi · Volvo · Lexus · Honda · Toyota · Hyundai</span>
      </div>
    </R3Frame>
  );
}

// ── Mobile forum thread detail ──────────────────────────────────────
function MobThread() {
  return (
    <div style={{padding:24, background:'var(--ink)', minHeight: 1116, display:'flex', flexDirection:'column'}}>
      <div style={{fontFamily:'var(--font-mono)', fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', marginBottom:16}}>Mobile · 375px · Forum thread detail</div>
      <div className="mob375" style={{height:1020, margin:'0 auto', overflow:'hidden', display:'flex', flexDirection:'column'}}>
        {/* status bar */}
        <div style={{padding:'10px 20px 8px', display:'flex', justifyContent:'space-between', fontFamily:'var(--font-mono)', fontSize:12, fontWeight:500, color:'#FAFAF6'}}>
          <span>9:41</span>
          <span style={{display:'flex', gap:6, alignItems:'center'}}>
            <span style={{fontSize:10}}>●●●●</span><span style={{fontSize:10}}>5G</span>
            <span style={{display:'inline-block', width:22, height:11, border:'1px solid rgba(255,255,255,0.6)', borderRadius:2, padding:1}}>
              <span style={{display:'block', width:'80%', height:'100%', background:'#fff', borderRadius:1}}></span>
            </span>
          </span>
        </div>
        {/* nav */}
        <div style={{padding:'12px 20px', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
          <span style={{fontSize:18, opacity:0.8}}>‹</span>
          <span style={{fontFamily:'var(--font-display)', fontSize:16, fontWeight:600}}>LeaseWise<span style={{color:'var(--lime)'}}>.</span></span>
          <span style={{fontSize:18, opacity:0.7}}>⌕</span>
        </div>
        {/* breadcrumb */}
        <div style={{padding:'12px 20px 8px', fontFamily:'var(--font-mono)', fontSize:10, color:'rgba(255,255,255,0.5)', letterSpacing:'0.04em'}}>
          Community / BMW / X3 30i Calgary…
        </div>

        <div style={{flex:1, overflow:'hidden', display:'flex', flexDirection:'column'}}>
          {/* Thread title + meta */}
          <div style={{padding:'8px 20px 18px', borderBottom:'1px solid rgba(255,255,255,0.08)'}}>
            <h1 style={{fontFamily:'var(--font-display)', fontSize:22, lineHeight:1.2, letterSpacing:'-0.015em', fontWeight:500, margin:'0 0 12px', color:'#fff'}}>
              X3 30i Calgary — dealer holding 92 days, do I lowball?
            </h1>
            <div style={{display:'flex', gap:6, marginBottom:10, flexWrap:'wrap'}}>
              <span style={{padding:'3px 8px', background:'rgba(255,255,255,0.08)', borderRadius:3, fontFamily:'var(--font-mono)', fontSize:10, color:'rgba(255,255,255,0.7)', textTransform:'uppercase'}}>BMW</span>
              <span style={{padding:'3px 8px', background:'rgba(196,240,66,0.10)', color:'var(--lime)', borderRadius:3, fontFamily:'var(--font-mono)', fontSize:10}}>AB</span>
              <span style={{padding:'3px 8px', background:'rgba(255,255,255,0.04)', color:'rgba(255,255,255,0.6)', borderRadius:3, fontFamily:'var(--font-mono)', fontSize:10}}>negotiation</span>
            </div>
            <div style={{display:'flex', justifyContent:'space-between', fontFamily:'var(--font-mono)', fontSize:11, color:'rgba(255,255,255,0.5)'}}>
              <span>by yyc_lease · 4h ago</span>
              <span>67 ⏎ · 1.4k 👁 · last 12m</span>
            </div>
          </div>

          {/* Original post */}
          <div style={{padding:'18px 20px', background:'rgba(196,240,66,0.025)', borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10}}>
              <span style={{fontSize:13, fontWeight:500, color:'#fff'}}>yyc_lease <span style={{padding:'1px 5px', marginLeft:4, background:'var(--lime)', color:'var(--ink)', borderRadius:2, fontSize:9, fontFamily:'var(--font-mono)', fontWeight:600}}>OP</span></span>
              <span style={{fontFamily:'var(--font-mono)', fontSize:10, color:'rgba(255,255,255,0.5)'}}>4h ago</span>
            </div>
            <div style={{fontSize:13, lineHeight:1.6, color:'rgba(255,255,255,0.9)'}}>
              Looking at a 2026 X3 xDrive30i at a Calgary dealer. Specifics:
              <div style={{margin:'10px 0', padding:'10px 12px', background:'rgba(0,0,0,0.3)', borderRadius:4, fontFamily:'var(--font-mono)', fontSize:12, lineHeight:1.7, color:'#FAFAF6'}}>
                MSRP <span style={{color:'#fff'}}>$62,400</span><br/>
                Asking <span style={{color:'#fff'}}>$58,900</span> (5.6% off)<br/>
                Days on lot <span style={{color:'var(--blood-orange)'}}>92</span><br/>
                Term · KM · MF <span style={{color:'#fff'}}>39 mo · 16k · .00166</span>
              </div>
              At 92 days I'm thinking they want this off the lot. April subvented rate is 3.99% so MF is captive. Is it reasonable to counter at $56,500 selling + ask for an extra $500 conquest? Anyone done a similar deal in YYC this month?
            </div>
            <div style={{display:'flex', gap:14, marginTop:14, fontFamily:'var(--font-mono)', fontSize:11, color:'rgba(255,255,255,0.5)'}}>
              <span>↑ 23</span><span>Reply</span><span>Quote</span><span style={{marginLeft:'auto'}}>⋯</span>
            </div>
          </div>

          {/* Replies */}
          {[
            { u:'ab_skeptic', ago:'3h ago', body: <>92 DOL is real pressure but don't get cute. Counter at <span style={{fontFamily:'var(--font-mono)', color:'#fff'}}>$57,200</span> selling, hold the MF at .00166, and demand both loyalty AND conquest stacked. If they balk on conquest, walk — there's a similar X3 at Calgary BMW South sitting 78 days. Lowballing $2,400 below asking on a $62k car is the kind of thing that loses you the deal even when the dealer needs the unit gone.</>, up: 41 },
            { u:'yyc_modhabitat', ago:'2h ago', body: <>Bought my X3 30i at the same store last October at <span style={{fontFamily:'var(--font-mono)', color:'#fff'}}>$2,100</span> off MSRP at 47 DOL. They moved on selling price faster than I expected; the pushback was on aftermarket adds (paint protection, tire&amp;rim — both refundable, both declined). Worksheet ended up <span style={{fontFamily:'var(--font-mono)', color:'#fff'}}>$724/mo</span> AB taxed. Your asking is already aggressive — focus the negotiation on incentive stacking, not selling price.</>, up: 28 },
            { u:'604_driver', ago:'1h ago', body: <>Counter-experience from BC: X3 30i, 88 DOL in Richmond, asked for the same lowball. Dealer let me walk. Came back two weeks later, car was still there, took it at <span style={{fontFamily:'var(--font-mono)', color:'#fff'}}>$57,400</span> with full conquest. The lesson: at 90+ DOL the dealer's pain is real but the salesperson's ego is also real. Don't insult the offer. Counter $57,200, walk if needed, expect to come back.</>, up: 19 },
          ].map(r => (
            <div key={r.u} style={{padding:'16px 20px', borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
                <span style={{fontSize:13, fontWeight:500, color:'#fff'}}>{r.u}</span>
                <span style={{fontFamily:'var(--font-mono)', fontSize:10, color:'rgba(255,255,255,0.5)'}}>{r.ago}</span>
              </div>
              <div style={{fontSize:13, lineHeight:1.55, color:'rgba(255,255,255,0.85)'}}>{r.body}</div>
              <div style={{display:'flex', gap:14, marginTop:10, fontFamily:'var(--font-mono)', fontSize:11, color:'rgba(255,255,255,0.5)'}}>
                <span>↑ {r.up}</span><span>Reply</span><span>Quote</span>
              </div>
            </div>
          ))}
        </div>

        {/* Reply composer */}
        <div style={{padding:'12px 20px', borderTop:'1px solid rgba(255,255,255,0.12)', background:'#000', display:'flex', gap:10, alignItems:'center'}}>
          <input type="text" placeholder="Reply…" style={{flex:1, height:40, padding:'0 14px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:20, color:'#fff', fontFamily:'var(--font-body)', fontSize:13}} />
          <button style={{width:40, height:40, borderRadius:20, background:'var(--lime)', color:'var(--ink)', border:'none', fontSize:16, fontWeight:600}}>↑</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { BMWFullBrand, MobThread });
