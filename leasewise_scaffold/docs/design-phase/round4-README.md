# LeaseWise — design handoff

A Canadian transparency-first car lease platform. Three rounds of design work, all consolidated into two canvases.

## Where things live

| File | What's in it |
|---|---|
| `index.html` | Round 1: complete app — homepage, calculator, deal rater, BMW brand page, forum, mobile/tablet, tweaks. Click around. |
| `round2.html` | Rounds 2 & 3: design canvas with state matrices, mobile artboards, system pages, light mode, design responses, and R3 polish (full BMW brand page, mobile thread detail). |
| `tokens.css` | Design tokens. `:root` is dark (default). `[data-theme=light]` is the optional paper palette. |
| `round1.css` / `round2.css` | Page-specific styles. |

## Source map (Round 1 — `index.html`)

| Component | Source file |
|---|---|
| Homepage | `home.jsx` |
| Calculator (forward + reverse) | `calc.jsx` |
| Deal Rater | `rater.jsx` |
| BMW brand guide v1 | `brand.jsx` |
| Forum (Bavarian Lounge etc.) | `forum.jsx` |
| Mobile + tablet variants | `mobile.jsx` |
| Tweaks panel | `tweaks-panel.jsx` |

## Source map (Rounds 2-3 — `round2.html`)

| Section | Source file |
|---|---|
| Calc output card · 7 states | `round2-states.jsx` (`COC*`) |
| Deal Rater · 7 states | `round2-states.jsx` (`DR*`) |
| Mobile · 5 screens at 375px | `round2-mobile.jsx` |
| Sources / components / icons / marks | `round2-system.jsx` |
| Light mode | `round2-system.jsx` (`Light*`) |
| R2 design responses | `round2-system.jsx` (`R2Responses`) |
| **R3 BMW full brand page** | `round3.jsx` (`BMWFullBrand`) |
| **R3 Mobile thread detail** | `round3.jsx` (`MobThread`) |

## Design system in one paragraph

Dark by default (`--ink #0A0A0A` on `--paper #FAFAF6`). Display type is Space Grotesk; body Inter; data JetBrains Mono — **all monetary values use mono** without exception. Accent is a single lime (`--lime #C4F042`) reserved for current programs and "good" outcomes; blood-orange for warnings, emerald for success states, amber for stale data. The lime dot in the wordmark is the only reductive mark — never a separate icon. Sentence case everywhere (no SHOUTY caps). Tabular numbers, always.

## Things that are intentional, not bugs

- **No emoji** anywhere. The brand isn't playful.
- **Mono numbers** even inside body copy — when a dollar value or rate appears mid-sentence it switches to mono. This is the core data-product tell.
- **Confidence badges** on every program (n=46, last sync 11m ago) — the platform's honesty about what it knows is a first-class UI affordance.
- **Paid placement is disclosed inline**, not in a footer. See sources page in `round2.html`.
- **Light mode exists but is opt-in.** Dark is the canonical brand expression.

## Open items / next steps

1. Real BMW Financial Services data feed integration (currently mock — structure is right).
2. Empty states for community moderation queue.
3. iOS/Android native shells (mobile artboards are the responsive web; native apps would change the floorplan-clock interaction).
4. Accessibility pass at AA on the lime-on-ink combo (it passes at large but not at body).

## Design tokens

```
--ink: #0A0A0A          background, dark
--paper: #FAFAF6        text on ink, background light
--lime: #C4F042         accent, current programs, "good"
--emerald: #1D9E75      success, "deal closed"
--blood-orange: #E04E2C warning, MF markup, expensive
--amber: #E8A33D        stale data, "verify"

--font-display: 'Space Grotesk'
--font-body: 'Inter'
--font-mono: 'JetBrains Mono'
```

That's it. Open `round2.html` for the canvas; open `index.html` to see the live app.
