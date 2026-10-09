# J_W_I_ — Design System

Softly-lit graphite. Every page is dark; the only light surface is the warm reading
sheet that carries long-form text. Amber is the identity accent; pastel blue is the
control accent.

## Pages

- `index.html` — hero wordmark + index of everything
- `swiftios6.html` — the "Swift on iOS 6" technical note
- `swiftonios6guidepart1.html` — the iOS 6 Setup Guide (full-screen interactive
  wizard, `guide1.js`): toolchain install, then a branch into the templates path
  or the manual project setup, then the finale
- `support.html` — contact

All links are relative (GitHub Pages, CNAME `j-w-i.org`). No build step; `styles.css`
and `site.js` are shared by every page; `guide1.js` is the toolchain guide's wizard
only.

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
  that silently un-sticks it; specificity bit us once.) In wizard app mode the
  resting margin is dropped, so the masthead is flush to the viewport top and
  `--mast-h` measures the bare height (61px desktop / 84px mobile); in-flow pages
  keep the 10px rest (71 / 94px). `--mast-h` is always `offsetHeight + computed
  top margin`, never `rect().bottom` — a sticky element's bottom edge is
  scroll-dependent.
- **Skip link** — every page opens with `<a class="skip-link" href="#main">`: the
  first Tab stop, invisible until focused, then a blue pill above the masthead
  (WCAG 2.4.1 bypass block). `main` carries `id="main"`.
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
- **Wizard** (setup guide) — a full-screen stage, not a panel: `main.wiz-main`
  fills the viewport below the masthead and the single visible `.wizard-step`
  floats centred on the page background (`align-content: safe center`, so the
  no-JS stack falls back to top alignment instead of clipping). Steps with a
  screenshot earn a third grid column beside the text; ≤ 860px the shot drops
  under the text. `guide1.js` shows exactly one logical step at a time and
  switches the section head (tick `a`–`e` + phase name + title + "phase · n of
  m" progress) with the step group. Every actionable step carries a
  `.confirm-box` — an 18 px macOS-style checkbox (inset well, blue gradient
  fill + `--blue-ink` tick when checked) — that gates the Next button until
  ticked. The step-4 branch is a two-card radio group (`.path-card`, green dot
  exactly like the OS picker) choosing the templates path or the manual path;
  `data-path` steps are hidden from the other branch. Per-OS variants
  (`[data-os]`) carry the OS name in their headings so each reads standalone;
  no-JS visitors get the whole guide stacked. Back/Next pill buttons in
  `.wiz-controls`; on the final step Next hides and a "Start over" ghost
  button resets the confirms and path choice (keeping the OS).
  In app mode the page itself must never scroll: `body.wiz-app` and the html
  element are `overflow: clip` (`hidden` still allows programmatic scrolling,
  which slid the footer up behind the shell), the footer is hidden, and
  `guide1.js` resets any pre-open scroll offset to 0 on entry. Anything that
  has to grow scrolls `.wiz-viewport`, never the page.

## Motion

Everything animates only under `prefers-reduced-motion: no-preference`
(CSS media gate + a `matchMedia` check in `site.js`).

- **Scroll reveals** — `.fade-io` fades + rises 14px the first time it enters the
  viewport (550ms) and *stays*; it never fades back out on scroll-up. The observer
  unobserves after first reveal.
- **Intro fades** — on load, the lead (the `[data-typewrite]` element) and the
  blocks named in `data-typewrite-then` fade in together (900 ms, no typing, no
  pauses, no stagger). Classes are stripped ~1.1 s later so the elements hand back
  to the scroll-reveal system. The blocks are hidden *instantly* (no transition on
  the way out) so the first paint never flashes visible → hidden → visible.
- **Every load** — the fade plays on every page load (no session memory). The
  home wordmark (`.hero-name`) rides the standard `.reveal` rise.
- **Code scrollbars** — `.code-screen` (and `.table-scroll`) use a thin custom
  scrollbar (`scrollbar-width: thin` + WebKit rules, `--surface-2` thumb) in place
  of the default OS bar.
- **Entrance** — `.reveal` rise animation for hero content.
- **Wizard steps** — each step revealed with `.wiz-enter` → `.wiz-shown`
  (340 ms opacity + 8 px rise, same language as `.fade-io`), driven by the wizard's
  state machine; skipped entirely under reduced motion. Steps deliberately carry no
  `.fade-io` — the section's first reveal already covers the initial paint.

## Print

`@media print` flips the palette through the tokens (the site is dark-only, so
light ink would otherwise print white on white), forces every reveal system to
its finished state — printing lays the document out in one pass, so an
unobserved `.fade-io` block would otherwise come out blank — and drops the
sticky/overlay chrome (masthead sticks statically, `.skip-link`, `.lightbox`,
`.wiz-controls` and the footer are hidden).

## Verification

`.qa/` holds the Playwright audits run against a local
`python3 -m http.server 8123 -d .`:

- `node shot.js` — 5 pages × 11 viewports, overflow/blank checks → expect `ALL_CLEAN`
- `node functional.js` — nav, copy buttons, mailto, anchors
- `node wizard.js` — all three OSes end-to-end (templates path ×3, manual path ×1),
  confirm-box gating, restart, copy round-trip, no-JS stack, reduced motion
- `node contrast.js` — WCAG pairs for every token combination
- `node .qa/audit2.js <sweep|zoom|resize|scroll|motion|interact>` — independent
  responsive matrix (25 widths × 4 pages plus the open wizard, zoom 50–200% via
  emulated effective viewport, live resize sequences, scroll states,
  reduced-motion and no-JS passes) writing `.qa/a2/*.json`;
  `node .qa/a2/report.js [modes…]` digs out the actionable rows
- `node .qa/verify14.js` — regression checks for the wizard scroll lock, the
  reveal safety net, the extreme-width step stage, the skip link and the
  mobile tap targets

Captures for visual review must be viewport screenshots taken after an instant
scroll pass; `fullPage: true` rasterises not-yet-revealed layers as blank fills
and reads as content loss that is not there.
