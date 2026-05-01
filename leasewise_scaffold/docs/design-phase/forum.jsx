// Forum index — themed Discourse-style category list
const { Header: FHeader, Footer: FFooter, useTheme: fTheme } = window;

function ForumApp() {
  const [theme, toggle] = fTheme();
  const D = window.LW_DATA;

  const cats = [
    { sec:'Pinned',   items: [['Monthly programs · April 2026', 1, 'pinned']] },
    { sec:'By brand', items: [['BMW',128],['Mercedes-Benz',91],['Audi',64],['Lexus',52],['Toyota',187],['Honda',144],['Hyundai',71],['Genesis',24],['Kia',46],['Volkswagen',58],['Volvo',31],['Mazda',38],['Subaru',45],['Ford',82],['GM',74],['Stellantis',39]] },
    { sec:'By province', items: [['Ontario',412],['Alberta',267],['British Columbia',231],['Québec',184],['Manitoba',58],['Saskatchewan',42],['Nova Scotia',38],['New Brunswick',24],['Newfoundland & Labrador',12],['PEI',8],['Yukon',4],['Northwest Territories',2],['Nunavut',1]] },
    { sec:'Topics', items: [['Deal war stories',356],['Negotiation tactics',218],['Lease takeovers',144],['Help & introductions',412],['Off-topic',88]] },
  ];

  const allThreads = [
    { id:'pinned', title:'Monthly programs · April 2026 — every brand, every captive', cat:'Programs', prov:'CA', replies:42, views:18204, last:'12 min ago', op:'lw-staff', solved:false, pinned:true },
    ...D.threads,
    { id:'t6', title:'X3 30i Calgary — dealer holding 92 days, do I lowball?', cat:'BMW', province:'AB', replies:14, views:892, last:'12 hr ago', op:'yyc_lease' },
    { id:'t7', title:'Lease takeover: 8 months left on RX 350 in Toronto, $0 payment', cat:'Lease takeovers', province:'ON', replies:31, views:1422, last:'1 day ago', op:'shortLease' },
    { id:'t8', title:'CR-V Hybrid Touring Burnaby — 4.99/36, residual 65%, fair?', cat:'Honda', province:'BC', replies:9, views:402, last:'2 days ago', op:'604_driver' },
  ];

  return (
    <div className="lw-app">
      <FHeader active="community" theme={theme} onToggleTheme={toggle} />
      <main id="main">
        <section className="forum-page">
          <div className="container">
            <div className="forum-head">
              <div>
                <span className="eyebrow">Community · /community</span>
                <h1 className="t-h1" style={{margin:'6px 0 8px'}}>The Canadian leasing forum.</h1>
                <p className="t-body-l c-secondary" style={{margin:0,maxWidth:'60ch'}}>
                  Real Canadians sharing real numbers. Read without an account. Post requires sign-in.
                </p>
              </div>
              <div className="forum-toolbar">
                <input className="input" placeholder="Search threads…" style={{width:240}} />
                <a href="#" className="btn btn--accent">New post</a>
              </div>
            </div>

            <div className="forum-grid">
              <aside className="forum-cats">
                {cats.map(group => (
                  <React.Fragment key={group.sec}>
                    <div className="forum-cat-head">{group.sec}</div>
                    {group.items.map(([name,count,flag]) => (
                      <a key={name} href="#" className={'forum-cat' + (name==='BMW'?' forum-cat--active':'')}>
                        <span>{name}</span>
                        <span className="forum-cat__count">{count}</span>
                      </a>
                    ))}
                  </React.Fragment>
                ))}
              </aside>

              <div>
                <div className="forum-list">
                  {allThreads.map(t => (
                    <a key={t.id} href="#" className={'forum-row' + (t.pinned?' forum-row--pinned':'')}>
                      <div>
                        <div className="forum-row__title">
                          {t.pinned && <span style={{color:'var(--lime)',marginRight:6}}>📌</span>}
                          {t.title}
                        </div>
                        <div className="forum-row__meta">
                          <span className="badge" title={t.cat==='Mercedes-Benz' ? 'Mercedes-Benz' : t.cat==='Volkswagen' ? 'Volkswagen' : undefined}>
                            {t.cat==='Mercedes-Benz' ? 'MERCEDES' : t.cat==='Volkswagen' ? 'VW' : t.cat}
                          </span>
                          {t.province && <span className="badge badge--info">{t.province}</span>}
                          {t.solved && <span className="badge badge--positive">Solved</span>}
                          <span className="t-body-s c-muted" style={{fontSize:11}}>by @{t.op}</span>
                        </div>
                      </div>
                      <div className="forum-row__num">{t.replies}<div style={{fontSize:10,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.05em'}}>replies</div></div>
                      <div className="forum-row__num">{(t.views||0).toLocaleString('en-CA')}<div style={{fontSize:10,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.05em'}}>views</div></div>
                      <div className="forum-row__last">{t.last}</div>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <FFooter />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<ForumApp />);
