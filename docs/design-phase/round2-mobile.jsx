// round2-mobile.jsx — 375px artboards, no device chrome.
// Renders responsive web layouts at the canonical mobile breakpoint.

function MobShell({ children, h = 720, label }) {
  return (
    <div style={{padding:24, background:'var(--ink)', minHeight: h+96, display:'flex', flexDirection:'column'}}>
      {label && <div style={{fontFamily:'var(--font-mono)', fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', marginBottom:16}}>{label}</div>}
      <div className="mob375" style={{height: h, margin:'0 auto', overflow:'hidden', display:'flex', flexDirection:'column'}}>
        {/* status bar */}
        <div style={{padding:'10px 20px 8px', display:'flex', justifyContent:'space-between', fontFamily:'var(--font-mono)', fontSize:12, fontWeight:500, color:'#FAFAF6'}}>
          <span>9:41</span>
          <span style={{display:'flex', gap:6, alignItems:'center'}}>
            <span style={{fontSize:10}}>●●●●</span>
            <span style={{fontSize:10}}>5G</span>
            <span style={{display:'inline-block', width:22, height:11, border:'1px solid rgba(255,255,255,0.6)', borderRadius:2, position:'relative', padding:1}}>
              <span style={{display:'block', width:'80%', height:'100%', background:'#fff', borderRadius:1}}></span>
            </span>
          </span>
        </div>
        <div style={{flex:1, overflow:'hidden', display:'flex', flexDirection:'column'}}>{children}</div>
      </div>
    </div>
  );
}

function MobNav() {
  return (
    <div style={{padding:'14px 20px', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
      <div style={{fontFamily:'var(--font-display)', fontSize:18, fontWeight:600, letterSpacing:'-0.01em'}}>
        LeaseWise<span style={{color:'var(--lime)'}}>.</span>
      </div>
      <div style={{display:'flex', gap:14, alignItems:'center'}}>
        <span style={{fontSize:18, opacity:0.7}}>⌕</span>
        <span style={{fontSize:20, opacity:0.7}}>≡</span>
      </div>
    </div>
  );
}

// ── Mobile Homepage ─────────────────────────────────────────────────
function MobHome() {
  const ticks = [
    ['BMW X3 30i · ON', '$748', 'up', '+ $24'],
    ['RX 350 · ON', '$682', 'down', '− $18'],
    ['CR-V Hyb · QC', '$524', 'down', '− $11'],
    ['GLC 300 · BC', '$948', 'up', '+ $42'],
  ];
  return (
    <MobShell label="Mobile · 375px · Homepage" h={920}>
      <MobNav />
      {/* Ticker strip */}
      <div style={{display:'flex', gap:0, padding:'10px 0', overflow:'hidden', borderBottom:'1px solid rgba(255,255,255,0.06)', background:'rgba(0,0,0,0.3)'}}>
        {ticks.concat(ticks).map((t,i) => (
          <div key={i} style={{flex:'0 0 auto', padding:'0 16px', borderRight:'1px solid rgba(255,255,255,0.06)', fontFamily:'var(--font-mono)', fontSize:11, whiteSpace:'nowrap'}}>
            <span style={{color:'rgba(255,255,255,0.5)'}}>{t[0]}</span>{' '}
            <span style={{color:'#FAFAF6'}}>{t[1]}</span>{' '}
            <span style={{color: t[2]==='up'?'var(--blood-orange)':'var(--lime)'}}>{t[3]}</span>
          </div>
        ))}
      </div>

      {/* Hero */}
      <div style={{padding:'32px 20px 24px'}}>
        <div style={{fontFamily:'var(--font-mono)', fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', color:'rgba(255,255,255,0.5)', marginBottom:12}}>April 2026 · Western Canada</div>
        <h1 style={{fontFamily:'var(--font-display)', fontSize:36, lineHeight:1.05, letterSpacing:'-0.025em', fontWeight:500, margin:0}}>
          Know what dealers know.
        </h1>
        <p style={{fontSize:14, lineHeight:1.5, color:'rgba(255,255,255,0.65)', margin:'14px 0 20px'}}>
          The Canadian leasing knowledge base. Real numbers, real people. We show our sources.
        </p>
        <div style={{display:'flex', gap:8}}>
          <button className="btn btn--accent" style={{flex:1, height:44}}>Calculate</button>
          <button className="btn btn--secondary" style={{flex:1, height:44, background:'rgba(255,255,255,0.06)', borderColor:'rgba(255,255,255,0.12)', color:'#fff'}}>Rate my deal</button>
        </div>
      </div>

      {/* Featured */}
      <div style={{padding:'8px 20px 20px'}}>
        <div style={{fontFamily:'var(--font-mono)', fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', color:'rgba(255,255,255,0.5)', marginBottom:10}}>Featured · audit</div>
        <div style={{padding:16, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:6}}>
            <strong style={{fontSize:14, fontWeight:500}}>2026 BMW X3 xDrive30i</strong>
            <span style={{padding:'3px 8px', background:'var(--lime)', color:'var(--ink)', borderRadius:4, fontSize:11, fontFamily:'var(--font-mono)', fontWeight:600}}>A · P84</span>
          </div>
          <div style={{fontSize:11, color:'rgba(255,255,255,0.5)', fontFamily:'var(--font-mono)', marginBottom:12}}>
            Anonymous · Calgary AB · Apr 18
          </div>
          <div style={{display:'flex', gap:12, fontFamily:'var(--font-mono)', fontSize:11, color:'rgba(255,255,255,0.7)'}}>
            <span>$698/mo</span><span>·</span><span>39mo</span><span>·</span><span>16k</span><span>·</span><span>3.99%</span>
          </div>
        </div>
      </div>

      {/* Programs list */}
      <div style={{padding:'8px 20px 24px'}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:10}}>
          <div style={{fontFamily:'var(--font-mono)', fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', color:'rgba(255,255,255,0.5)'}}>Active programs</div>
          <a style={{fontSize:11, color:'var(--lime)', textDecoration:'none'}}>see all 47 →</a>
        </div>
        {[
          ['BMW X3 30i', '3.99%', '59%', 'Apr 30'],
          ['Lexus RX 350', '5.49%', '57%', 'May 1'],
          ['Honda CR-V Hyb', '4.99%', '63%', 'Apr 30'],
        ].map(([n,r,res,exp]) => (
          <div key={n} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 0', borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
            <div>
              <div style={{fontSize:14, fontWeight:500}}>{n}</div>
              <div style={{fontSize:11, fontFamily:'var(--font-mono)', color:'rgba(255,255,255,0.5)', marginTop:2}}>{r} · {res} RV</div>
            </div>
            <span style={{fontSize:11, fontFamily:'var(--font-mono)', color:'var(--blood-orange)'}}>{exp}</span>
          </div>
        ))}
      </div>
    </MobShell>
  );
}

// ── Mobile Calculator ───────────────────────────────────────────────
function MobCalc() {
  return (
    <MobShell label="Mobile · 375px · Calculator" h={880}>
      <MobNav />
      <div style={{padding:'24px 20px 16px'}}>
        <div style={{fontFamily:'var(--font-mono)', fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', color:'rgba(255,255,255,0.5)', marginBottom:8}}>Tool · /tools/calculator</div>
        <h1 style={{fontFamily:'var(--font-display)', fontSize:28, lineHeight:1.1, letterSpacing:'-0.02em', fontWeight:500, margin:0}}>Calculate the payment.</h1>
        <p style={{fontSize:13, lineHeight:1.5, color:'rgba(255,255,255,0.6)', margin:'10px 0 0'}}>
          Real captive-lender programs. Real provincial tax math. No "starting at."
        </p>
      </div>

      {/* Forward / Reverse tabs */}
      <div style={{padding:'0 20px', display:'flex', gap:0, borderBottom:'1px solid rgba(255,255,255,0.08)'}}>
        <span style={{padding:'12px 0', marginRight:24, fontSize:13, fontWeight:500, color:'#fff', borderBottom:'2px solid var(--lime)'}}>Forward</span>
        <span style={{padding:'12px 0', fontSize:13, color:'rgba(255,255,255,0.5)'}}>Reverse</span>
      </div>

      {/* Inputs */}
      <div style={{padding:'16px 20px', display:'flex', flexDirection:'column', gap:12, flex:1}}>
        {[
          ['Vehicle', '2026 BMW X3 xDrive30i', null],
          ['Province', 'Alberta', 'GST 5%'],
          ['Term', '39 months', '3.99% APR · 59% RV'],
          ['Annual KM', '16,000', null],
          ['Down payment', '$0', null],
        ].map(([l,v,h]) => (
          <div key={l} style={{padding:'10px 12px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8}}>
            <div style={{fontSize:10, fontFamily:'var(--font-mono)', textTransform:'uppercase', letterSpacing:'0.06em', color:'rgba(255,255,255,0.5)'}}>{l}</div>
            <div style={{fontSize:15, marginTop:4, display:'flex', justifyContent:'space-between', alignItems:'baseline'}}>
              <span>{v}</span>
              <span style={{fontSize:10, fontFamily:'var(--font-mono)', color:'rgba(255,255,255,0.5)'}}>{h}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Sticky payment card */}
      <div style={{padding:20, background:'#000', borderTop:'1px solid rgba(255,255,255,0.12)'}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:6}}>
          <span style={{fontSize:11, color:'rgba(255,255,255,0.5)', fontFamily:'var(--font-mono)', textTransform:'uppercase', letterSpacing:'0.06em'}}>Monthly · taxed</span>
          <span style={{fontSize:11, color:'var(--lime)', fontFamily:'var(--font-mono)'}}>P84</span>
        </div>
        <div style={{display:'flex', alignItems:'baseline', justifyContent:'space-between'}}>
          <div style={{fontFamily:'var(--font-display)', fontSize:48, fontWeight:500, letterSpacing:'-0.025em', lineHeight:1}}>
            $698<span style={{fontSize:15, fontFamily:'var(--font-mono)', color:'rgba(255,255,255,0.5)', marginLeft:6, fontWeight:400}}>/mo</span>
          </div>
          <span style={{fontSize:18, color:'rgba(255,255,255,0.4)'}}>↗</span>
        </div>
      </div>
    </MobShell>
  );
}

// ── Mobile Rater ────────────────────────────────────────────────────
function MobRater() {
  return (
    <MobShell label="Mobile · 375px · Deal Rater" h={840}>
      <MobNav />
      <div style={{padding:'24px 20px 12px'}}>
        <div style={{fontFamily:'var(--font-mono)', fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', color:'rgba(255,255,255,0.5)', marginBottom:8}}>Tool · /tools/deal-rater</div>
        <h1 style={{fontFamily:'var(--font-display)', fontSize:28, lineHeight:1.1, letterSpacing:'-0.02em', fontWeight:500, margin:0}}>Rate your worksheet.</h1>
      </div>

      {/* Result hero */}
      <div style={{padding:'16px 20px', display:'flex', alignItems:'center', gap:16}}>
        <div style={{fontFamily:'var(--font-display)', fontSize:88, lineHeight:0.9, fontWeight:500, color:'var(--lime)', letterSpacing:'-0.04em'}}>A</div>
        <div>
          <div style={{fontFamily:'var(--font-display)', fontSize:18, fontWeight:600, lineHeight:1.2}}>2026 BMW X3 xDrive30i</div>
          <div style={{fontSize:12, color:'rgba(255,255,255,0.5)', marginTop:4}}>39 mo · 16k km · AB</div>
          <div style={{fontSize:12, color:'var(--lime)', fontFamily:'var(--font-mono)', marginTop:4}}>P84 · top 16% of Apr</div>
        </div>
      </div>

      {/* 3-up compare */}
      <div style={{padding:'0 20px', marginBottom:16}}>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:1, background:'rgba(255,255,255,0.08)', borderRadius:8, overflow:'hidden'}}>
          {[['Yours','$698','var(--lime)'],['Median','$742','#FAFAF6'],['Top 10%','$684','#FAFAF6']].map(([l,v,c]) => (
            <div key={l} style={{padding:'12px 10px', background:'rgba(255,255,255,0.04)'}}>
              <div style={{fontSize:9, fontFamily:'var(--font-mono)', textTransform:'uppercase', color:'rgba(255,255,255,0.5)', letterSpacing:'0.06em'}}>{l}</div>
              <div style={{fontFamily:'var(--font-mono)', fontSize:16, color:c, marginTop:4, fontWeight:500}}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Feedback */}
      <div style={{padding:'0 20px 16px', display:'flex', flexDirection:'column', gap:8}}>
        {[
          ['MF matches captive base', '0.00166 = 3.99% APR', 'good'],
          ['Loyalty correctly applied', '$1,500 BMW loyalty cap reduction', 'good'],
          ['Acquisition fee at par', '$675 — BMW captive standard', null],
        ].map(([t,d,k]) => (
          <div key={t} style={{padding:'10px 12px', borderLeft:`3px solid ${k==='good'?'var(--lime)':'rgba(255,255,255,0.15)'}`, background:'rgba(255,255,255,0.03)', borderRadius:'0 4px 4px 0'}}>
            <div style={{fontSize:13, fontWeight:500}}>{t}</div>
            <div style={{fontSize:11, color:'rgba(255,255,255,0.6)', fontFamily:'var(--font-mono)', marginTop:2}}>{d}</div>
          </div>
        ))}
      </div>

      <div style={{padding:'12px 20px 20px', borderTop:'1px solid rgba(255,255,255,0.08)', marginTop:'auto'}}>
        <div style={{display:'flex', gap:8}}>
          <button className="btn btn--accent" style={{flex:1, height:44}}>Share anonymously</button>
          <button style={{width:44, height:44, borderRadius:6, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', color:'#fff', fontSize:18}}>↓</button>
        </div>
      </div>
    </MobShell>
  );
}

// ── Mobile Forum ────────────────────────────────────────────────────
function MobForum() {
  const threads = [
    ['Markham Honda CR-V Hybrid Touring — $612/mo, did I leave money on the table?', 'GTA Honda Hub', 'thomasleased', '23m', 47, 'P61'],
    ['BMW Q2 program leaked — X5 45e at 2.99%/60% on 36mo', 'Bavarian Lounge', 'modhabitat', '1h', 142, null],
    ['Quebec residual market: how to flip a Tesla Model Y at end of term', 'Belt-Drive Bistro', 'qcleaser', '2h', 89, null],
    ['MERCEDES-BENZ GLC pull-ahead: anyone get the $4k loyalty stacked with conquest?', 'Sterndecks', 'glcdriver', '3h', 31, null],
    ['Lease end inspection — what counts as "wear and tear" in Ontario?', 'Pull-Ahead Pulpit', 'leaserookie', '5h', 67, null],
  ];
  return (
    <MobShell label="Mobile · 375px · Forum" h={760}>
      <MobNav />
      <div style={{padding:'18px 20px 12px'}}>
        <h1 style={{fontFamily:'var(--font-display)', fontSize:24, lineHeight:1.1, fontWeight:500, margin:0, letterSpacing:'-0.02em'}}>The Floorplan</h1>
        <div style={{fontSize:11, color:'rgba(255,255,255,0.5)', fontFamily:'var(--font-mono)', marginTop:4}}>1,247 active · 4 hubs</div>
      </div>

      {/* Hub chips */}
      <div style={{padding:'0 20px 14px', display:'flex', gap:6, overflow:'hidden'}}>
        {['All', 'Bavarian', 'GTA Honda', 'Sterndecks', 'Belt-Drive'].map((c,i) => (
          <span key={c} style={{padding:'6px 12px', borderRadius:99, background: i===0?'#FAFAF6':'rgba(255,255,255,0.06)', color: i===0?'var(--ink)':'#fff', fontSize:11, fontFamily:'var(--font-mono)', whiteSpace:'nowrap'}}>{c}</span>
        ))}
      </div>

      {/* Threads */}
      <div style={{flex:1, overflow:'hidden'}}>
        {threads.map(([t, hub, u, ago, c, p], i) => (
          <div key={i} style={{padding:'14px 20px', borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
            <div style={{fontSize:14, lineHeight:1.35, marginBottom:6, textWrap:'pretty'}}>{t}</div>
            <div style={{display:'flex', gap:8, alignItems:'center', fontSize:10, fontFamily:'var(--font-mono)', color:'rgba(255,255,255,0.5)', flexWrap:'wrap'}}>
              <span style={{color:'var(--lime)'}}>{hub}</span>
              <span>·</span>
              <span>{u}</span>
              <span>·</span>
              <span>{ago}</span>
              <span style={{marginLeft:'auto', display:'flex', gap:8, alignItems:'center'}}>
                {p && <span style={{color:'var(--lime)'}}>{p}</span>}
                <span>{c} ⏎</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </MobShell>
  );
}

// ── Mobile Brand ───────────────────────────────────────────────────
function MobBrand() {
  return (
    <MobShell label="Mobile · 375px · BMW brand page" h={880}>
      <MobNav />
      <div style={{padding:'20px 20px 16px', borderBottom:'1px solid rgba(255,255,255,0.08)'}}>
        <div style={{fontFamily:'var(--font-mono)', fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', color:'rgba(255,255,255,0.5)', marginBottom:8}}>Brand · BMW · Apr 2026</div>
        <h1 style={{fontFamily:'var(--font-display)', fontSize:32, lineHeight:1.05, letterSpacing:'-0.02em', fontWeight:500, margin:0}}>BMW Canada</h1>
        <div style={{display:'flex', gap:14, marginTop:14, fontFamily:'var(--font-mono)', fontSize:11}}>
          <div><span style={{color:'rgba(255,255,255,0.5)'}}>Programs</span> <span style={{color:'#FAFAF6'}}>4 active</span></div>
          <div><span style={{color:'rgba(255,255,255,0.5)'}}>Captive</span> <span style={{color:'#FAFAF6'}}>BMW Financial Services Canada</span></div>
        </div>
      </div>

      {/* Headline program */}
      <div style={{padding:'20px', background:'rgba(196,240,66,0.04)', borderBottom:'1px solid rgba(255,255,255,0.08)'}}>
        <div style={{fontFamily:'var(--font-mono)', fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--lime)', marginBottom:8}}>Headline · X3 xDrive30i</div>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
          <div><div style={{fontSize:10, color:'rgba(255,255,255,0.5)', fontFamily:'var(--font-mono)', textTransform:'uppercase'}}>Term</div><div style={{fontSize:20, fontFamily:'var(--font-display)', fontWeight:500, marginTop:2}}>39 mo</div></div>
          <div><div style={{fontSize:10, color:'rgba(255,255,255,0.5)', fontFamily:'var(--font-mono)', textTransform:'uppercase'}}>APR</div><div style={{fontSize:20, fontFamily:'var(--font-display)', fontWeight:500, marginTop:2}}>3.99%</div></div>
          <div><div style={{fontSize:10, color:'rgba(255,255,255,0.5)', fontFamily:'var(--font-mono)', textTransform:'uppercase'}}>Residual</div><div style={{fontSize:20, fontFamily:'var(--font-display)', fontWeight:500, marginTop:2}}>59%</div></div>
          <div><div style={{fontSize:10, color:'rgba(255,255,255,0.5)', fontFamily:'var(--font-mono)', textTransform:'uppercase'}}>KM/yr</div><div style={{fontSize:20, fontFamily:'var(--font-display)', fontWeight:500, marginTop:2}}>16,000</div></div>
        </div>
      </div>

      {/* Lineup */}
      <div style={{padding:'18px 20px 12px'}}>
        <div style={{fontFamily:'var(--font-mono)', fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', color:'rgba(255,255,255,0.5)', marginBottom:10}}>Active lineup</div>
        {[
          ['X3 xDrive30i', '$748/mo', 'A−'],
          ['X5 xDrive40i', '$1,124/mo', 'B'],
          ['3 Series 330i xDrive', '$612/mo', 'A'],
          ['i4 eDrive40', '$648/mo', 'A−'],
        ].map(([n,p,g]) => (
          <div key={n} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 0', borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
            <div>
              <div style={{fontSize:14, fontWeight:500}}>{n}</div>
              <div style={{fontSize:11, fontFamily:'var(--font-mono)', color:'rgba(255,255,255,0.5)', marginTop:2}}>{p} · ON</div>
            </div>
            <span style={{fontFamily:'var(--font-mono)', fontSize:13, color: g.startsWith('A')?'var(--lime)':'#FAFAF6'}}>{g}</span>
          </div>
        ))}
      </div>

      {/* Captive note */}
      <div style={{padding:'16px 20px 20px', marginTop:'auto'}}>
        <div style={{padding:14, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8}}>
          <div style={{fontSize:11, color:'rgba(255,255,255,0.5)', fontFamily:'var(--font-mono)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6}}>Captive levers</div>
          <div style={{fontSize:12, lineHeight:1.5, color:'rgba(255,255,255,0.85)'}}>
            BMW FS supports MF buy-down up to 50 bps with conquest+loyalty stacking. Watch for $1,500 loyalty (auto) and $1,500 conquest (negotiated).
          </div>
        </div>
      </div>
    </MobShell>
  );
}

Object.assign(window, { MobHome, MobCalc, MobRater, MobForum, MobBrand });
