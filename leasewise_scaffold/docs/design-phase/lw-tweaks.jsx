// LeaseWise Tweaks panel — dev/designer utility (Cmd/Ctrl + Shift + .)
// Density, theme, accent hue, type scale, grid overlay, data state, loading state, a11y annotations

const LW_TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "density": "comfortable",
  "themeMode": "auto",
  "accentHue": 75,
  "typeScale": 1.0,
  "gridOverlay": false,
  "dataState": "rich",
  "loadingState": false,
  "a11yAnnotations": false
}/*EDITMODE-END*/;

function LWTweaks() {
  const [t, setTweak] = useTweaks(LW_TWEAK_DEFAULTS);
  const [visible, setVisible] = useState(false);

  // Cmd/Ctrl + Shift + . toggles visibility
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === '.') {
        e.preventDefault();
        setVisible(v => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Apply tweaks to <html> via CSS vars / classes
  useEffect(() => {
    const r = document.documentElement;
    // density: 1.0 comfortable, 0.86 compact, 1.1 comfy
    const dens = t.density === 'compact' ? 0.86 : t.density === 'comfy' ? 1.1 : 1.0;
    r.style.setProperty('--density', dens);
    r.style.setProperty('--type-scale', t.typeScale);
    // Accent hue — derive lime variants from a hue offset (75 = baseline lime)
    const baseHue = 75;
    const offset = t.accentHue - baseHue;
    const newLime = `oklch(92% 0.20 ${75 + offset})`;
    const newLimeDeep = `oklch(70% 0.16 ${75 + offset})`;
    r.style.setProperty('--lime', newLime);
    r.style.setProperty('--lime-deep', newLimeDeep);

    // Theme mode override
    if (t.themeMode !== 'auto') {
      r.setAttribute('data-theme', t.themeMode);
      localStorage.setItem('lw-theme', t.themeMode);
    }

    // Grid overlay class
    document.body.classList.toggle('grid-overlay', !!t.gridOverlay);
    document.body.classList.toggle('lw-thin-data', t.dataState === 'thin');
    document.body.classList.toggle('lw-loading', !!t.loadingState);
    document.body.classList.toggle('lw-a11y', !!t.a11yAnnotations);
  }, [t]);

  if (!visible) {
    return (
      <button
        onClick={() => setVisible(true)}
        title="Open Tweaks (⌘⇧.)"
        style={{
          position:'fixed', right:16, bottom:16, zIndex:99,
          width:32, height:32, borderRadius:8, border:'1px solid var(--border)',
          background:'var(--surface)', color:'var(--text-muted)', cursor:'default',
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:12,
        }}
        aria-label="Open developer tweaks panel"
      >
        ⌘
      </button>
    );
  }

  return (
    <TweaksPanel title="Tweaks · dev" onClose={() => setVisible(false)}>
      <TweakSection label="Display" />
      <TweakRadio label="Density" value={t.density}
        options={['compact','comfortable','comfy']}
        onChange={(v)=>setTweak('density', v)} />
      <TweakRadio label="Theme" value={t.themeMode}
        options={['light','auto','dark']}
        onChange={(v)=>setTweak('themeMode', v)} />
      <TweakSlider label="Type scale" value={t.typeScale} min={0.85} max={1.15} step={0.05}
        onChange={(v)=>setTweak('typeScale', v)} />
      <TweakSlider label="Accent hue" value={t.accentHue} min={50} max={130} step={1} unit="°"
        onChange={(v)=>setTweak('accentHue', v)} />

      <TweakSection label="States" />
      <TweakRadio label="Data" value={t.dataState}
        options={['thin','rich']}
        onChange={(v)=>setTweak('dataState', v)} />
      <TweakToggle label="Loading skeletons" value={t.loadingState}
        onChange={(v)=>setTweak('loadingState', v)} />

      <TweakSection label="Inspect" />
      <TweakToggle label="Grid overlay" value={t.gridOverlay}
        onChange={(v)=>setTweak('gridOverlay', v)} />
      <TweakToggle label="A11y annotations" value={t.a11yAnnotations}
        onChange={(v)=>setTweak('a11yAnnotations', v)} />

      <div style={{fontSize:10, color:'rgba(41,38,27,.5)', paddingTop:8, lineHeight:1.4}}>
        Toggle this panel anytime with <span style={{fontFamily:'var(--font-mono)'}}>⌘⇧.</span>
      </div>
    </TweaksPanel>
  );
}

// Mount Tweaks UI into a separate root after main app
window.addEventListener('DOMContentLoaded', () => {
  // wait one tick for main app
  setTimeout(() => {
    let host = document.getElementById('lw-tweaks-root');
    if (!host) {
      host = document.createElement('div');
      host.id = 'lw-tweaks-root';
      document.body.appendChild(host);
    }
    ReactDOM.createRoot(host).render(<LWTweaks />);
  }, 50);
});
