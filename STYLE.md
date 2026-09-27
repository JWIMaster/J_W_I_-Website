# J_W_I_ — Design System

Softly-lit graphite. Every page is dark; the only light surface is the warm reading
sheet that carries long-form text. Amber is the identity accent; pastel blue is the
control accent.

## Pages

- `index.html` — hero wordmark + index of everything
- `swiftios6.html` — the "Swift on iOS 6" technical note
- `swiftonios6guidepart1.html` — Toolchain Guide
- `swiftonios6guidepart2.html` — Project Setup guide
- `support.html` — contact

All links are relative (GitHub Pages, CNAME `j-w-i.org`). No build step; `styles.css`
and `site.js` are shared by every page.

## Colour

| Token | Value | Use |
| --- | --- | --- |
| `--bg-0` | `#17181b` | deepest: code screens |
| `--bg-1` | `#1e2024` | page background |
| `--surface-0/1/2` | `#24262b / #2a2d33 / #31353c` | raised panels, hover, strong hover |
| `--inset-0` | `#1a1b1f` | recessed wells |
| `--sheet` / `--sheet-hi` | `#262329` / `#2b2830` | the warm dark reading sheet (article) |
| `--sheet-ink` / `-soft` / `-faint` | `#e9e6de` / `#aaa49a` / `#948e84` | sheet text: body / secondary / meta |
| `--ink-0..3` | `#edeeef` → `#828893` | page text: body → tertiary |
| `--accent` / `-hi` / `-lo` | `#e5a13d` / `#f0b45c` / `#c9862a` | **identity only**: kickers, ticks, active-nav underscore, hero underscore, step badges |
| `--blue` / `-hi` / `-lo` | `#8fb5dd` / `#a9c9ea` / `#6f99c6` | **controls only**: buttons, typing cursor |
| `--blue-ink` | `#132338` | text on blue fills (7.4:1 on `--blue`) |

Rules of thumb:
- Amber never appears on a control; blue never appears on identity marks.
- The sheet is warm (slight violet-brown lift over the neutral graphite) so prose
  reads as a "page" without a light surface. Code figures sit darker still.
- Every text/background pair clears WCAG AA (≥ 4.5:1); `ink-2` at 4.27:1 is
  reserved for tertiary meta only.

## Type & rhythm

- Display/body: system sans; mono: system mono for kickers, badges, code.
- Section kickers: mono, letter-spaced, amber tick (`/`, `a`, `b`, …) prefix.
- Space scale `--s-1 … --s-8`; radius scale `--r-s/m/l` (concentric: inner
  elements one step smaller than their container).

## Components

- **Masthead** — sticky, `z-index: 50`, rests 10px below the top edge and pins to
  `top: 0` on scroll. Brand mark = green dot + `J_W_I_`. Nav links get the amber
  active underline. (Never give the masthead a `position: relative` group rule —
  that silently un-sticks it; specificity bit us once.)
- **Buttons** — pills (`border-radius: 999px`), press = `scale(0.96)`.
  Primary: blue gradient fill, `--blue-ink` text, soft glow. Ghost: blue outline,
  blue text. Small variant for code-bar copy buttons.
- **Code figures** — `figure.code`: surface gradient bar (title + copy button) over
  a `--bg-0` screen. `margin-inline: 0` keeps the panel flush with the surrounding
  text (the UA figure's 40px inline margin would otherwise indent it).
- **Steps** — 40px badge column + body; badges are amber mono numerals on raised
  squares, joined by a vertical rule. Code panels inside steps align with the step
  text.
- **Sheet** — the article container; warm dark surface, 48px padding, sheet-ink
  text, hairline `--sheet-line` edges.

## Motion

Everything animates only under `prefers-reduced-motion: no-preference`
(CSS media gate + a `matchMedia` check in `site.js`).

- **Scroll reveals** — `.fade-io` fades + rises 14px the first time it enters the
  viewport (550ms) and *stays*; it never fades back out on scroll-up. The observer
  unobserves after first reveal.
- **Typewriter leads** — `[data-typewrite="n"]` elements type their first *n*
  sentences at a fast cadence (~9–18 ms/char) with a blinking blue cursor while the
  element itself fades in in parallel; then the remaining sentences and the blocks
  named in `data-typewrite-then` fade in, staggered 120 ms. Classes are stripped
  afterwards so the elements hand back to the scroll-reveal system.
- **Once per session** — each typewritten element carries a `data-tw-key`;
  `sessionStorage` remembers it, so revisiting a page within the session shows the
  finished text with no re-typing. The home wordmark (`.hero-name`) types its six
  letters once, then the DOM is restored to its authored markup.
- **Entrance** — `.reveal` rise animation for hero content.

## Verification

`.qa/` holds the Playwright audits run against a local
`python3 -m http.server 8123 -d .`:

- `node shot.js` — 5 pages × 11 viewports, overflow/blank checks → expect `ALL_CLEAN`
- `node functional.js` — nav, copy buttons, mailto, anchors
- `node contrast.js` — WCAG pairs for every token combination
