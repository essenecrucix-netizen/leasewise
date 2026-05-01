// Shared chrome (header, footer) + small UI helpers.
// Globals expected: React, ReactDOM, window.LW_DATA, window.LW_MATH

const { useState, useEffect, useRef, useMemo, useCallback } = React;

// ── Logo ────────────────────────────────────────────────────────────────
function Logo({ size = 22, variant = 'default' }) {
  // Spec: "LeaseWise" in Space Grotesk Medium + lime dot after the W
  const dotColor = variant === 'inverted' ? 'var(--ink)' : 'var(--lime)';
  const wordColor = variant === 'inverted' ? 'var(--lime)'
    : variant === 'on-dark' ? 'var(--paper)'
    : 'var(--text)';
  return (
    <a href="index.html" className="lw-logo" aria-label="LeaseWise Canada — home"
       style={{ display:'inline-flex', alignItems:'baseline', gap:0, textDecoration:'none',
                fontFamily:'var(--font-display)', fontWeight:500, fontSize:size,
                letterSpacing:'-0.01em', color: wordColor }}>
      <span>LeaseWise</span>
      <span aria-hidden="true" style={{
        display:'inline-block', width:size*0.32, height:size*0.32,
        borderRadius:'50%', background: dotColor, marginLeft: size*0.18,
        transform:`translateY(-${size*0.04}px)`,
      }} />
    </a>
  );
}

// ── Header ──────────────────────────────────────────────────────────────
function Header({ active = '', onToggleTheme, theme, onSearch }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const items = [
    { key:'tools', label:'Tools', href:'calculator.html' },
    { key:'community', label:'Community', href:'forum.html' },
    { key:'intel', label:'Intel', href:'rater.html' },
    { key:'learn', label:'Learn', href:'brand.html' },
  ];
  return (
    <header className="lw-header">
      <div className="container lw-header__row">
        <a href="#main" className="skip-link">Skip to main content</a>
        <Logo />
        <nav className="lw-nav" aria-label="Primary">
          {items.map(it => (
            <a key={it.key} href={it.href}
               className={'lw-nav__link' + (active===it.key ? ' lw-nav__link--active':'')}>
              {it.label}
            </a>
          ))}
        </nav>
        <div className="lw-header__right">
          <button className="lw-icon-btn" aria-label="Search" title="Search (⌘K)" onClick={onSearch}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
          </button>
          <button className="lw-icon-btn" aria-label={theme==='dark'?'Switch to light mode':'Switch to dark mode'} title="Theme" onClick={onToggleTheme}>
            {theme==='dark' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 12.8A9 9 0 0 1 11.2 3a7.5 7.5 0 1 0 9.8 9.8z"/></svg>
            )}
          </button>
          <a href="#" className="btn btn--secondary btn--sm lw-signin">Sign in</a>
          <button className="lw-icon-btn lw-hamburger" aria-label="Menu" onClick={()=>setMobileOpen(v=>!v)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
          </button>
        </div>
      </div>
      {mobileOpen && (
        <div className="lw-mobile-nav">
          {items.map(it => (
            <a key={it.key} href={it.href} className="lw-mobile-nav__item">{it.label}</a>
          ))}
          <a href="#" className="lw-mobile-nav__item">Sign in</a>
        </div>
      )}
    </header>
  );
}

// ── Footer ──────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="lw-footer">
      <div className="container lw-footer__inner">
        <div className="lw-footer__brand">
          <Logo size={20} />
          <p className="t-body-s c-muted" style={{maxWidth:280, marginTop:12}}>
            Real Canadian lease data for Canadians who lease. No accounts required to start. No leads sold.
          </p>
        </div>
        <FooterCol title="Tools" items={[
          'Lease calculator', 'Payment reverse', 'Lease vs. buy', 'Deal rater',
          'Takeover ranker', 'Lot heat map', 'F&I decoder', 'Incentive stacker', 'Timing advisor'
        ]} />
        <FooterCol title="Intel" items={[
          'Monthly programs', 'Residual tracker', 'Deal benchmarks', 'Inventory'
        ]} />
        <FooterCol title="Learn" items={[
          'How leases work', 'Provincial tax guides', 'Negotiation playbook',
          'F&I office guide', 'Brand guides', 'Floorplan explainer', 'Glossary'
        ]} />
        <FooterCol title="LeaseWise" items={[
          'About', 'Sources', 'Privacy', 'Terms', 'Contact'
        ]} />
      </div>
      <div className="container lw-footer__bottom">
        <span>© 2026 LeaseWise Canada</span>
        <span className="c-muted">v1.0 · Built in Canada</span>
        <a href="sources.html" className="lw-footer__sources">Where our data comes from →</a>
      </div>
    </footer>
  );
}
function FooterCol({ title, items }) {
  return (
    <div className="lw-footer__col">
      <div className="eyebrow" style={{marginBottom:12}}>{title}</div>
      <ul>
        {items.map(i => <li key={i}><a href="#">{i}</a></li>)}
      </ul>
    </div>
  );
}

// ── Counter (animated number) ───────────────────────────────────────────
function useTicker(intervalMs = 1000) {
  const [t, setT] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setT(x => x+1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return t;
}

// ── Provincial selector ────────────────────────────────────────────────
const ALL_PROVINCES = ['AB','BC','ON','QC','MB','SK','NS','NB','NL','PE','YT','NT','NU'];

// ── Theme hook — persists to localStorage, defaults to dark per spec ────
function useTheme() {
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'dark';
    return localStorage.getItem('lw-theme') || 'dark';
  });
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('lw-theme', theme);
  }, [theme]);
  return [theme, () => setTheme(t => t === 'dark' ? 'light' : 'dark')];
}

// ── Grade color helper ─────────────────────────────────────────────────
function gradeColor(g) {
  if (g==='A') return 'var(--emerald)';
  if (g==='B') return 'var(--emerald)';
  if (g==='C') return 'var(--text-muted)';
  if (g==='D') return 'var(--amber)';
  return 'var(--blood-orange)';
}

// Expose to other Babel scripts
Object.assign(window, {
  Logo, Header, Footer, useTicker, useTheme, gradeColor, ALL_PROVINCES,
});
