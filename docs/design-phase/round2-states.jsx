// round2-states.jsx — Calculator output card states + Deal Rater states
// All artboards are 1x renders, sized to fit content.
const { useState: rs1 } = React;

// ─────────────────────────────────────────────────────────────────
// Calculator output card — 7 states
// ─────────────────────────────────────────────────────────────────
function COCFrame({ children, w = 408, label }) {
  return (
    <div style={{padding:24, background:'var(--ink)', minHeight:520, display:'flex', flexDirection:'column', justifyContent:'center'}}>
      {label && <div style={{fontFamily:'var(--font-mono)', fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', marginBottom:16}}>{label}</div>}
      <div style={{width:w, margin:'0 auto'}}>{children}</div>
    </div>
  );
}

function COCEmpty() {
  return (
    <COCFrame label="01 · Empty (initial)">
      <div className="coc">
        <div className="coc__eyebrow"><span>Estimated payment</span><span style={{color:'rgba(255,255,255,0.3)'}}>—</span></div>
        <div className="coc__pay" style={{color:'rgba(255,255,255,0.18)'}}>$ —<sub style={{color:'rgba(255,255,255,0.18)'}}>/month, taxed</sub></div>
        <div style={{padding:24, border:'1px dashed var(--border)', borderRadius:8, textAlign:'center', color:'var(--text-muted)', fontSize:12, lineHeight:1.5}}>
          Pick a vehicle and enter terms.<br/>We'll surface the math, the dealer levers, and the percentile.
        </div>
        <div className="coc__break" style={{opacity:0.4}}>
          <div className="coc__row"><span className="coc__row-l">Base monthly</span><span className="coc__row-v">—</span></div>
          <div className="coc__row"><span className="coc__row-l">Tax</span><span className="coc__row-v">—</span></div>
          <div className="coc__row coc__row--total"><span className="coc__row-l">Monthly (taxed)</span><span className="coc__row-v">—</span></div>
        </div>
      </div>
    </COCFrame>
  );
}

function COCLoading() {
  const Bar = ({w,h=12}) => <div className="coc__skel" style={{width:w, height:h}} />;
  return (
    <COCFrame label="02 · Calculating (skeleton)">
      <div className="coc">
        <div className="coc__eyebrow"><span>Estimated payment</span><Bar w={48} h={11}/></div>
        <Bar w={260} h={64} />
        <div className="coc__break">
          {[0,1,2,3].map(i => (
            <div key={i} className="coc__row"><Bar w={120} h={11}/><Bar w={64} h={11}/></div>
          ))}
        </div>
        <Bar w="100%" h={40} />
      </div>
    </COCFrame>
  );
}

function COCSuccess() {
  return (
    <COCFrame label="03 · Success (great deal)">
      <div className="coc">
        <div className="coc__eyebrow">
          <span>Estimated payment</span>
          <span style={{color:'var(--lime)'}}>● live · BMW Apr 2026</span>
        </div>
        <div className="coc__pay">$698<sub>/mo · taxed in AB</sub></div>
        <div className="coc__pctile coc__pctile--good">
          <span>Better than 84% of Apr deals (n=412)</span>
          <span>P84</span>
        </div>
        <div className="coc__break">
          <div className="coc__row"><span className="coc__row-l">Base monthly</span><span className="coc__row-v">$664.76</span></div>
          <div className="coc__row"><span className="coc__row-l">+ GST 5%</span><span className="coc__row-v">$33.24</span></div>
          <div className="coc__row coc__row--total"><span className="coc__row-l">Monthly (taxed)</span><span className="coc__row-v">$698.00</span></div>
          <div className="coc__row"><span className="coc__row-l">Drive-off (1st + fees)</span><span className="coc__row-v">$1,420</span></div>
          <div className="coc__row"><span className="coc__row-l">Cost over 39 mo</span><span className="coc__row-v">$28,642</span></div>
        </div>
      </div>
    </COCFrame>
  );
}

function COCWarning() {
  return (
    <COCFrame label="04 · Warning (markup detected)">
      <div className="coc">
        <div className="coc__eyebrow"><span>Estimated payment</span><span style={{color:'var(--amber)'}}>⚠ markup detected</span></div>
        <div className="coc__pay" style={{color:'var(--amber)'}}>$812<sub style={{color:'var(--text-muted)'}}>/mo · taxed in ON</sub></div>
        <div className="coc__pctile coc__pctile--warn">
          <span>Below average — 38th percentile (n=287)</span>
          <span>P38</span>
        </div>
        <div className="coc__flag">
          <div>
            <strong>Money factor marked up</strong>
            Quoted MF .00250 (6.00%) vs. captive base .00166 (3.99%). Costs you ~$94/mo over 39 months.
          </div>
        </div>
        <div className="coc__break">
          <div className="coc__row"><span className="coc__row-l">Base monthly</span><span className="coc__row-v">$719.03</span></div>
          <div className="coc__row"><span className="coc__row-l">+ HST 13%</span><span className="coc__row-v">$93.47</span></div>
          <div className="coc__row coc__row--total"><span className="coc__row-l">Monthly (taxed)</span><span className="coc__row-v">$812.50</span></div>
        </div>
      </div>
    </COCFrame>
  );
}

function COCEdge() {
  return (
    <COCFrame label="05 · Edge case (BC luxury)">
      <div className="coc">
        <div className="coc__eyebrow"><span>Estimated payment</span><span style={{color:'var(--blood-orange)'}}>● BC luxury surtax</span></div>
        <div className="coc__pay">$1,940<sub>/mo · BC</sub></div>
        <div className="coc__flag" style={{borderLeftColor:'var(--blood-orange)'}}>
          <div>
            <strong>BC luxury surtax applies</strong>
            Vehicle price $148,500 exceeds the $124,999 threshold. Additional 5% PST on the purchase portion ≈ $1,150 over the term.
          </div>
        </div>
        <div className="coc__break">
          <div className="coc__row"><span className="coc__row-l">Base monthly</span><span className="coc__row-v">$1,732.14</span></div>
          <div className="coc__row"><span className="coc__row-l">+ GST 5% + PST 7%</span><span className="coc__row-v">$207.86</span></div>
          <div className="coc__row"><span className="coc__row-l">+ Luxury surcharge</span><span className="coc__row-v">$29.51</span></div>
          <div className="coc__row coc__row--total"><span className="coc__row-l">Monthly (taxed)</span><span className="coc__row-v">$1,940.00</span></div>
        </div>
      </div>
    </COCFrame>
  );
}

function COCError() {
  return (
    <COCFrame label="06 · Error (no program)">
      <div className="coc">
        <div className="coc__eyebrow"><span style={{color:'var(--blood-orange)'}}>● No active program</span></div>
        <div className="coc__pay" style={{color:'rgba(255,255,255,0.18)'}}>$ —<sub style={{color:'var(--text-muted)'}}>/mo · taxed</sub></div>
        <div className="coc__flag">
          <div>
            <strong>No published lease program for this trim/term</strong>
            Captive lender Volvo Car Financial does not currently publish a 24-mo program on the XC60. Try 36 or 48 mo, or check the deal rater for a custom worksheet.
          </div>
        </div>
        <div style={{display:'flex', gap:8}}>
          <button className="btn btn--accent" style={{flex:1}}>Try 36 months</button>
          <button className="btn btn--secondary" style={{flex:1}}>Notify me</button>
        </div>
      </div>
    </COCFrame>
  );
}

function COCStale() {
  return (
    <COCFrame label="07 · Stale (program ended)">
      <div className="coc" style={{opacity:0.85}}>
        <div className="coc__eyebrow"><span>Last-known payment</span><span style={{color:'var(--amber)'}}>⏱ March 2026 program · expired</span></div>
        <div className="coc__pay" style={{color:'var(--text-muted)'}}>$524<sub>/mo · taxed in QC</sub></div>
        <div className="coc__flag" style={{background:'rgba(186,117,23,0.10)', borderLeftColor:'var(--amber)'}}>
          <div>
            <strong>Program ended Mar 31, 2026</strong>
            April program not yet published by Honda Financial. Last seen: 4.49% / 63% RV. We'll auto-update within 24h of release.
          </div>
        </div>
        <div className="coc__break">
          <div className="coc__row"><span className="coc__row-l">Last base monthly</span><span className="coc__row-v">$455.78</span></div>
          <div className="coc__row"><span className="coc__row-l">+ QC tax 14.975%</span><span className="coc__row-v">$68.22</span></div>
          <div className="coc__row coc__row--total"><span className="coc__row-l">Monthly (taxed)</span><span className="coc__row-v">$524.00</span></div>
        </div>
      </div>
    </COCFrame>
  );
}

// ─────────────────────────────────────────────────────────────────
// Deal Rater — 7 states
// ─────────────────────────────────────────────────────────────────
function DRFrame({ children, w = 528, label }) {
  return (
    <div style={{padding:24, background:'var(--ink)', minHeight:560, display:'flex', flexDirection:'column'}}>
      {label && <div style={{fontFamily:'var(--font-mono)', fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', marginBottom:16}}>{label}</div>}
      <div style={{width:w, margin:'0 auto', flex:1, display:'flex', flexDirection:'column'}}>{children}</div>
    </div>
  );
}

function DREmpty() {
  return (
    <DRFrame label="01 · Empty (input)">
      <div className="dr" style={{flex:1}}>
        <div className="dr__tabs">
          <span className="dr__tab dr__tab--active">Paste text</span>
          <span className="dr__tab">Upload PDF</span>
          <span className="dr__tab">Type it out</span>
        </div>
        <div style={{fontSize:12, color:'var(--text-muted)', lineHeight:1.5}}>
          Paste your dealer's lease worksheet or screenshot of the deal sheet. We'll parse the numbers and grade against {' '}
          <span style={{color:'var(--lime)'}}>1,247 anonymized Canadian leases</span> from the same vehicle, term, and province.
        </div>
        <textarea className="dr__textarea" placeholder="2026 BMW X3 xDrive30i&#10;MSRP: $62,400&#10;Selling price: $58,900&#10;Term: 39 mo&#10;Money factor: 0.00166&#10;Residual: 59%&#10;..."></textarea>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <span style={{fontSize:11, color:'var(--text-muted)'}}>Anonymous · we strip dealer/customer names automatically</span>
          <button className="btn btn--accent">Rate this deal</button>
        </div>
      </div>
    </DRFrame>
  );
}

function DRParsing() {
  return (
    <DRFrame label="02 · Parsing">
      <div className="dr" style={{flex:1}}>
        <div style={{display:'flex', alignItems:'center', gap:12, padding:'16px 0'}}>
          <div className="dot-spinner" style={{width:24, height:24, border:'2px solid var(--border)', borderTopColor:'var(--lime)', borderRadius:'50%', animation:'spin 0.8s linear infinite'}}></div>
          <div>
            <div style={{fontSize:14, fontWeight:500}}>Parsing your worksheet</div>
            <div style={{fontSize:12, color:'var(--text-muted)', fontFamily:'var(--font-mono)', marginTop:2}}>extracted 8 of 12 fields…</div>
          </div>
        </div>
        <div style={{display:'flex', flexDirection:'column', gap:8}}>
          {[
            ['VEHICLE', '2026 BMW X3 xDrive30i', true],
            ['MSRP', '$62,400', true],
            ['Selling price', '$58,900', true],
            ['Term', '39 months', true],
            ['Money factor', '0.00166', true],
            ['Residual', '59% ($36,816)', true],
            ['KM/yr', '16,000', true],
            ['Province', 'Alberta', true],
            ['Loyalty', null, false],
            ['Trade equity', null, false],
            ['Down payment', null, false],
            ['Monthly payment', null, false],
          ].map(([k,v,done]) => (
            <div key={k} style={{display:'flex', justifyContent:'space-between', fontSize:12, padding:'6px 0', borderBottom:'1px solid var(--border-soft)'}}>
              <span style={{fontFamily:'var(--font-mono)', textTransform:'uppercase', color:'var(--text-muted)', fontSize:10, letterSpacing:'0.06em'}}>
                {done ? '✓' : '·'} {k}
              </span>
              <span style={{fontFamily:'var(--font-mono)', color: done ? 'var(--text)' : 'var(--text-muted)'}}>{v ?? 'searching…'}</span>
            </div>
          ))}
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </DRFrame>
  );
}

function DRA() {
  return (
    <DRFrame label="03 · Grade A (84th)">
      <div className="dr" style={{flex:1}}>
        <div className="dr__top">
          <div className="dr__grade" style={{color:'var(--lime)'}}>A</div>
          <div className="dr__head">
            <h3>2026 BMW X3 xDrive30i</h3>
            <div style={{fontSize:13, color:'var(--text-muted)'}}>39 mo · 16k km · Alberta</div>
            <div className="dr__pct" style={{marginTop:6}}>P84 · better than 84% of Apr deals</div>
          </div>
        </div>
        <div className="dr__compare">
          <div className="dr__comparecell"><div className="dr__comparecell-l">Your $/mo</div><div className="dr__comparecell-v" style={{color:'var(--lime)'}}>$698</div></div>
          <div className="dr__comparecell"><div className="dr__comparecell-l">Median</div><div className="dr__comparecell-v">$742</div></div>
          <div className="dr__comparecell"><div className="dr__comparecell-l">Best 10%</div><div className="dr__comparecell-v">$684</div></div>
        </div>
        <div className="dr__fb">
          <div className="dr__fbitem dr__fbitem--good"><strong>Money factor matches captive base</strong>0.00166 = 3.99% APR — no markup. ~92% of dealers mark this up.</div>
          <div className="dr__fbitem dr__fbitem--good"><strong>Loyalty applied correctly</strong>$1,500 BMW loyalty is on the worksheet as a cap reduction.</div>
          <div className="dr__fbitem"><strong>Acquisition fee at par</strong>$675 is the BMW captive standard for ON/AB/BC.</div>
        </div>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop:12, borderTop:'1px solid var(--border-soft)'}}>
          <span style={{fontSize:11, color:'var(--text-muted)', fontFamily:'var(--font-mono)'}}>n=412 · Apr 2026 · same trim/term/province</span>
          <button className="btn btn--secondary" style={{height:32, padding:'0 12px', fontSize:12}}>Share anonymously</button>
        </div>
      </div>
    </DRFrame>
  );
}

function DRB() {
  return (
    <DRFrame label="04 · Grade B (60th)">
      <div className="dr" style={{flex:1}}>
        <div className="dr__top">
          <div className="dr__grade" style={{color:'var(--emerald)'}}>B</div>
          <div className="dr__head">
            <h3>2026 Honda CR-V Hybrid Touring</h3>
            <div style={{fontSize:13, color:'var(--text-muted)'}}>48 mo · 20k km · Ontario</div>
            <div className="dr__pct" style={{marginTop:6}}>P61 · solid, room to negotiate</div>
          </div>
        </div>
        <div className="dr__compare">
          <div className="dr__comparecell"><div className="dr__comparecell-l">Your $/mo</div><div className="dr__comparecell-v">$612</div></div>
          <div className="dr__comparecell"><div className="dr__comparecell-l">Median</div><div className="dr__comparecell-v">$598</div></div>
          <div className="dr__comparecell"><div className="dr__comparecell-l">Best 10%</div><div className="dr__comparecell-v">$556</div></div>
        </div>
        <div className="dr__fb">
          <div className="dr__fbitem dr__fbitem--good"><strong>MF at captive base</strong>0.00187 (4.49%) — no markup.</div>
          <div className="dr__fbitem dr__fbitem--warn"><strong>Selling price 1.8% over best comp</strong>You're at $48,200 vs. lowest April comp of $47,350 (Markham Honda).</div>
          <div className="dr__fbitem dr__fbitem--warn"><strong>Doc fee high for ON</strong>$799 vs. provincial average of $499. Push back — most dealers will move $200+.</div>
        </div>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop:12, borderTop:'1px solid var(--border-soft)'}}>
          <span style={{fontSize:11, color:'var(--text-muted)', fontFamily:'var(--font-mono)'}}>n=298 · Apr 2026 · same trim/term/province</span>
          <button className="btn btn--secondary" style={{height:32, padding:'0 12px', fontSize:12}}>Share anonymously</button>
        </div>
      </div>
    </DRFrame>
  );
}

function DRD() {
  return (
    <DRFrame label="05 · Grade D (markup)">
      <div className="dr" style={{flex:1}}>
        <div className="dr__top">
          <div className="dr__grade" style={{color:'var(--blood-orange)'}}>D</div>
          <div className="dr__head">
            <h3>2025 Mercedes-Benz GLC 300 4MATIC</h3>
            <div style={{fontSize:13, color:'var(--text-muted)'}}>36 mo · 18k km · British Columbia</div>
            <div className="dr__pct" style={{marginTop:6}}>P14 · walk away or counter hard</div>
          </div>
        </div>
        <div className="dr__compare">
          <div className="dr__comparecell"><div className="dr__comparecell-l">Your $/mo</div><div className="dr__comparecell-v" style={{color:'var(--blood-orange)'}}>$948</div></div>
          <div className="dr__comparecell"><div className="dr__comparecell-l">Median</div><div className="dr__comparecell-v">$842</div></div>
          <div className="dr__comparecell"><div className="dr__comparecell-l">Best 10%</div><div className="dr__comparecell-v">$789</div></div>
        </div>
        <div className="dr__fb">
          <div className="dr__fbitem dr__fbitem--bad"><strong>MF marked up 80 bps</strong>0.00275 (6.60%) vs. MB-Financial base 0.00250 (5.99%). Costs $58/mo over the term — $2,088 total.</div>
          <div className="dr__fbitem dr__fbitem--bad"><strong>Residual 4 pts below program</strong>56% on the worksheet vs. published 60% — moves base monthly up ~$92.</div>
          <div className="dr__fbitem dr__fbitem--warn"><strong>"Wear protection" $42/mo</strong>Optional GAP/wear add-on. Decline; refundable on most MB lease contracts.</div>
        </div>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop:12, borderTop:'1px solid var(--border-soft)'}}>
          <span style={{fontSize:11, color:'var(--text-muted)', fontFamily:'var(--font-mono)'}}>n=87 · Apr 2026 · same trim/term/province</span>
          <button className="btn btn--secondary" style={{height:32, padding:'0 12px', fontSize:12}}>Get rebuttal script</button>
        </div>
      </div>
    </DRFrame>
  );
}

function DRConfidence() {
  return (
    <DRFrame label="06 · Low confidence (parse incomplete)">
      <div className="dr" style={{flex:1}}>
        <div className="dr__top">
          <div className="dr__grade" style={{color:'var(--amber)'}}>?</div>
          <div className="dr__head">
            <h3>Likely Volvo XC60 · 2025</h3>
            <div style={{fontSize:13, color:'var(--text-muted)'}}>Term & province unconfirmed</div>
            <div className="dr__pct" style={{marginTop:6, color:'var(--amber)'}}>Confidence 43% — fill the gaps below</div>
          </div>
        </div>
        <div style={{display:'flex', flexDirection:'column', gap:8}}>
          <div style={{fontSize:11, color:'var(--text-muted)', fontFamily:'var(--font-mono)', textTransform:'uppercase', letterSpacing:'0.06em'}}>We need:</div>
          {['Term length (months)', 'Annual KM allowance', 'Province for tax math', 'Money factor or APR'].map(q => (
            <div key={q} style={{display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background:'var(--surface-2)', borderRadius:6}}>
              <div style={{width:6, height:6, borderRadius:'50%', background:'var(--amber)'}}></div>
              <span style={{fontSize:13, flex:1}}>{q}</span>
              <span style={{fontSize:11, color:'var(--text-muted)', fontFamily:'var(--font-mono)'}}>tap to add</span>
            </div>
          ))}
        </div>
        <div style={{padding:12, background:'rgba(255,210,63,0.06)', borderRadius:6, fontSize:12, color:'var(--text-muted)', lineHeight:1.5}}>
          We can grade with what we have, but the percentile will be wide (±15 pts). Filling these tightens it to ±3 pts.
        </div>
      </div>
    </DRFrame>
  );
}

function DRError() {
  return (
    <DRFrame label="07 · Couldn't parse">
      <div className="dr" style={{flex:1, justifyContent:'center'}}>
        <div style={{display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center', gap:16, padding:32}}>
          <div style={{width:48, height:48, borderRadius:'50%', background:'rgba(232,89,60,0.10)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--blood-orange)', fontFamily:'var(--font-display)', fontSize:24}}>!</div>
          <div>
            <h3 style={{margin:0, fontFamily:'var(--font-display)', fontSize:22, fontWeight:600}}>We couldn't read this worksheet</h3>
            <p style={{margin:'8px 0 0', color:'var(--text-muted)', fontSize:13, lineHeight:1.5, maxWidth:340}}>
              The PDF looks like a scanned image rather than text. OCR found {`<`}30% of expected fields.
            </p>
          </div>
          <div style={{display:'flex', gap:8, width:'100%'}}>
            <button className="btn btn--accent" style={{flex:1}}>Type the numbers manually</button>
            <button className="btn btn--secondary" style={{flex:1}}>Try a clearer scan</button>
          </div>
          <div style={{fontSize:11, color:'var(--text-muted)', fontFamily:'var(--font-mono)', paddingTop:8}}>
            Tip: most dealers email a text PDF if you ask for "the lease pencil"
          </div>
        </div>
      </div>
    </DRFrame>
  );
}

Object.assign(window, {
  COCEmpty, COCLoading, COCSuccess, COCWarning, COCEdge, COCError, COCStale,
  DREmpty, DRParsing, DRA, DRB, DRD, DRConfidence, DRError,
});
