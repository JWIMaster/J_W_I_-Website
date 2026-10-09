# J_W_I_ — Design System

Softly-lit graphite. Every page is dark; the warm dark reading
sheet carries long-form text. Amber is the identity accent; warm silver carries primary actions and
muted steel blue identifies links and focus.

## Pages

- `index.html` — hero wordmark + index of everything
- `swiftios6.html` — the "Swift on iOS 6" technical note
- `swiftonios6guidepart1.html` — the iOS 6 Setup Guide (full-screen interactive
  wizard, `guide1.js`): toolchain install, then a branch into the templates path
  or the manual project setup, then the finale
- `support.html` — contact
- `photography.html` — three public Pixieset collections, image-led layout and
  collapsed native album details; generated from `data/photography.json`

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
| `--ink-0..3` | `#edeeef` → `#989faa` | page text: body → tertiary |
| `--accent` / `-hi` / `-lo` | `#e5a13d` / `#f0b45c` / `#c9862a` | **identity only**: kickers, ticks, active-nav underscore, hero underscore, step badges |
| `--blue` / `-hi` / `-lo` | `#9aaec3` / `#bbc8d6` / `#8198b0` | links, focus and small control details |
| `--action` / `-hi` / `-lo` | `#c7c3b9` / `#dedbd4` / `#b1aca2` | warm silver primary buttons |
| `--action-ink` | `#242322` | dark primary-button labels |
| `--blue-ink` | `#132338` | text on blue fills |

Rules of thumb:
- Amber never appears on a control; blue never appears on identity marks.
- The sheet is warm (slight violet-brown lift over the neutral graphite) so prose
  reads as a "page" without a light surface. Code figures sit darker still.
- Secondary labels use `--ink-2: #9ba1ab` and numerals use
  `--ink-3: #989faa`, keeping small text readable on graphite surfaces.

## Type & rhythm

- Display/body: Libre Franklin; long-form: Newsreader; mono: Spline Sans Mono
  (kickers, badges, numerals, code). Webfonts with system fallbacks.
- The scale is deliberately restrained at the top (`--t-2xl` 27px section title,
  `--t-4xl` 46px page title, `--t-display` ≤5.1rem wordmark): hierarchy comes
  from weight, tracking and position as much as size. Tracking tokens
  `--track-display / --track-title / --track-label`; the floor is −0.04em.
- Section kickers: mono, letter-spaced, amber tick (`/`, `a`, `b`, …) prefix,
  riding a hairline that dissolves to the right — the legend is the rule's
  caption, not an eyebrow floating above the heading.
- Every number is set `tabular-nums` (index numbers, step badges, progress,
  tables, download chips) so counts read as measurement.
- Browser surfaces are part of the design: themed text selection, caret colour,
  the page scrollbar (graphite thumb, inset track), link underline offset and
  thickness, and focus rings that follow each control's own radius.

## Geometry

- Radius scale — `--r-s` 4 (chips, inline code), `--r-m` 6 (cards, controls,
  code figures, list frames), `--r-l` 10 (large panels), `--r-xl` 12 (the reading
  sheet), `--r-control` 6 (the working control radius). **Nothing is a pill**;
  only progress ticks, scrollbar thumbs and the status dots are round. Larger
  radii are reserved for the two surfaces that genuinely behave like panes
  (the sheet, the lightbox).
- Control geometry — one height for every working control (`--h-control` 38px,
  `--h-control-sm` 28px) and one radius, so buttons, cards and list rows line up
  without being identical.
- Depth — a 1px contact shadow for edge definition plus one soft ambient shadow
  (`--elev-1/2/3`), an `--edge-hi` top highlight on raised surfaces and
  `--inset-1`/`--inset-screen` on recessed ones. No coloured halos: the only
  glow left is the status dot, which is an LED.
- **Cards are the exception, not the container.** The home index is a divided
  strip of four columns; the ledger rows are hairline-separated rows, not cards;
  the support block is a plate between two rules. Reach for a panel only when a
  surface genuinely floats above the page.

## Components

- **Masthead** — a graphite navigation strip extending 12px beyond the content on
  each side, with 7px corners, a fine border and a light shadow. No filled tabs.
  Sticky, `z-index: 50`, with the same 10px top margin and resting position on
  every page. Desktop uses one compact row; mobile stacks the brand above 44px
  navigation targets. A thin amber underline identifies the current link;
  hover and keyboard focus draw a quiet underline. The toolbar never translates
  or animates on entry. The shadow deepens gently while pinned, with no backdrop
  blur. `--mast-h` is measured as `rect.height + computed top margin`, never
  `rect().bottom`, since a sticky element's bottom is scroll-dependent.
- **Skip link** — every page opens with `<a class="skip-link" href="#main">`: the
  first Tab stop, invisible until focused, then a blue control above the masthead
  (WCAG 2.4.1 bypass block). `main` carries `id="main"`.
- **Buttons** — one geometry: 38px tall (44px on touch devices), `--r-control` (6px), 1px border, an
  inner top highlight over a shallow surface gradient. Press is *grounded*:
  the control sinks (`translateY(0.5px)`) and its fill darkens under an inset
  shadow — no scale pop. Primary: warm silver fill, `--action-ink` text. Ghost: neutral graphite
  fill and outline, light text. Small variant (28px) for code-bar copy buttons.
- **Index strip** (home) — the hero's table of contents: four divided columns
  (number, name, one line of what it is) under a full-width legend, sitting on
  the section rule. Two columns ≤860px, one hairline-separated column ≤560px.
  `site.js` marks the section the reader is in with an amber mark on the strip's
  own rule and `aria-current`.
- **Reading progress** — a 2px amber hairline along the top edge, injected by
  `site.js` on pages longer than ~1.6 screens; hidden in wizard app mode.
- **Ledger rows** (home sections) — hairline-divided rows on the page
  background: number, title + description, and the row's action. Hover raises
  the row one step and turns the number amber. Never cards.
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
  no-JS stack falls back to top alignment instead of clipping). Screenshots
  follow the instructions in one reading column, centred without surrounding
  boxes. Images retain their natural proportions under a shared height limit.
  Code steps use the full reading width and put their Xcode screenshot in a
  collapsed “View Xcode reference” disclosure. Long code lines wrap, and short
  windows use a smaller image height limit. `guide1.js` shows exactly one logical step at a time and
  switches the section head (tick `a`–`e` + phase name + title + "phase · n of
  m" progress) with the step group. Every actionable step carries a
  `.confirm-box` — an 18 px macOS-style checkbox (inset well, blue gradient
  fill + `--blue-ink` tick when checked) — that is ticked by the first Next click; the second click advances. The step-4 branch is a two-card radio group (`.path-card`, green dot
  exactly like the OS picker) choosing the templates path or the manual path;
  `data-path` steps are hidden from the other branch. Per-OS variants
  (`[data-os]`) carry the OS name in their headings so each reads standalone;
  no-JS visitors get the whole guide stacked. Back/Next buttons in
  `.wiz-controls`; on the final step Next hides and a "Start over" ghost
  button resets the confirms and path choice (keeping the OS).
  In app mode the page itself must never scroll: `body.wiz-app` and the html
  element cannot scroll: the body clips, while the root uses `overflow: hidden`
  with a fixed height to preserve `scrollbar-gutter: stable`. The footer is hidden, and
  `guide1.js` resets any pre-open scroll offset to 0 on entry. Anything that
  has to grow scrolls `.wiz-viewport`, never the page. The stage can shrink
  below its content height, and each navigation resets its scroll offset.
  The phase heading aligns left; desktop controls and progress share one row.
  On narrow screens progress moves underneath. Screenshot buttons open a
  keyboard-accessible preview with an explicit close button and Escape support.

## Motion

Everything animates only under `prefers-reduced-motion: no-preference`
(CSS media gate + a `matchMedia` check in `site.js`). One curve carries the
whole site — `--ease` is expo-out (`cubic-bezier(0.16, 1, 0.3, 1)`) so every
state change leaves quickly and settles softly — with `--t-press` 90ms for
anything answering a pointer, `--t-fast` 140ms for state, `--t-med` 240ms for
layers, `--t-slow` 460ms for entrances.

- **Press** — controls sink (`translateY(0.5px)`) and darken under an inset
  shadow. No scale pops; nothing bounces.
- **Nav** — one underline serves hover and current: it grows from the centre on
  hover and is simply already there on the current page.
- **Scroll reveals** — `.fade-io` fades + rises 8px the first time it enters the
  viewport and *stays*; it never fades back out on scroll-up. The observer
  unobserves after first reveal, and a rAF-throttled sweep on scroll/resize
  guarantees nothing stays hidden when content is jumped past.
- **Masthead** — gains a deeper shadow once pinned (`is-stuck`), so it reads as
  a layer above the page rather than a band that happens to sit there.
- **Article intro** — the opening sentence streams over 300ms, then the rest
  of the prose fades in over 450ms with a small stagger capped at 160ms.
  The full sentence reserves its layout and
  remains available to screen readers without swapping its layout. User wheel,
  touch or keyboard navigation and enabling reduced motion complete it immediately;
  browser scroll restoration and visibility changes do not cancel typing.
  No-JS shows the full text. `node .qa/article-intro.js` checks the sequence,
  repeated refreshes and layout stability.
- **Article refresh stability** — the heading uses Home’s rise entrance with `overflow-anchor: none`; its
  layout stays fixed. The sheet and paragraphs fade using opacity only. Refresh restoration can otherwise preserve an
  animated offset and accumulate scroll drift. `node .qa/article-refresh.js`
  checks eight rapid reloads without resetting scroll against the local HTTP preview.
- **Every load** — the fade plays on every page load (no session memory). The
  home wordmark (`.hero-name`) rides the standard `.reveal` rise, and the index
  strip assembles itself once (staggered 60–210ms) — the hero is the page's one
  authored moment; everything below it fades in quietly.
- **Code scrollbars** — `.code-screen` uses a thin custom scrollbar
  (`scrollbar-width: thin` + WebKit rules, `--surface-2` thumb).
- **Wizard steps** — each step revealed with `.wiz-enter` → `.wiz-shown`
  (340 ms opacity + 14px rise, same language as `.fade-io`), driven by the wizard's
  state machine; skipped entirely under reduced motion. Steps deliberately carry no
  `.fade-io` — the section's first reveal already covers the initial paint. The
  phase's step ticks and the progress hairline update on the same beat.

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
- `node .qa/guide-layout.js` — every template and manual step at 320, 390,
  768, 1024 and 1440px; header alignment across all pages, image proportions,
  stage overflow, scroll reset and keyboard screenshot preview. Set
  `JWI_PREVIEW_BASE=file:///absolute/path/to/repo/` to test directly from files,
  or `JWI_PREVIEW_HEIGHT=568` to check short windows.
- `node .qa/verify14.js` — regression checks for the wizard scroll lock, the
  reveal safety net, the extreme-width step stage, the skip link and the
  mobile tap targets
- `node .qa/header-consistency.js` — verifies header, brand and navigation
  geometry when opening the guide from a scrolled article.
- `node .qa/design-review.js` — all pages at five widths, button fit and palette contrast.
- `node .qa/guide-entry.js` — click from the scrolled Swift article into the
  guide with delayed scripts; checks first-frame step visibility, header
  alignment and absence of an article fade on the app shell.

Captures for visual review must be viewport screenshots taken after an instant
scroll pass; `fullPage: true` rasterises not-yet-revealed layers as blank fills
and reads as content loss that is not there.

## UI polish

The home hero opens with a mono “Code · Colour · Camera” legend. Colour Snap
earns a six-colour strip; it is decorative and hidden from assistive technology.
Home actions use trailing arrows (diagonal for external destinations). Keyboard
focus raises ledger rows like pointer hover, and control focus uses muted steel blue.
Primary link buttons keep dark text on hover; disabled buttons do not pick up
hover styling. Confirmed wizard actions use the same grounded press and neutral
shadow as the other controls. Arrow movement honours reduced motion.

## Playful motion

Page headings and their rules enter together. The home wordmark underscores
settle into place; brand dots ping on hover; project numbers nudge and Colour
Snap swatches alternate gently. Buttons have a short landing beat, nav underlines
grow on hover, and screenshot previews zoom slightly on hover. These effects
run on entry or interaction rather than looping, and all new motion is gated
by `prefers-reduced-motion`. `node .qa/motion-polish.js` verifies both preferences
on all four pages.

Article, support and guide titles share Home’s 500ms fade-and-rise entrance.
Animated title containers are excluded from scroll anchoring to prevent reload drift.
`node .qa/title-fades.js` checks each page and reduced motion.

Guide choices have 24px of space after their description. Step numbers pop in,
choices and downloads arrive in a short stagger, and images and code enter
with their step. Selection dots, confirmations and the current progress tick
give a brief acknowledgement. All effects respect reduced motion; verify them
and picker spacing with `node .qa/guide-motion.js`.

The home wordmark letters drop in with a 45ms stagger, squash lightly on
landing, then rebound and settle within a second. The title's layout stays
fixed, and reduced motion shows the completed wordmark immediately.
The wordmark also has a slow highlight that passes over its amber underscores
once every nine seconds. It adds no elements or controls and does not move the
letters. Reduced motion keeps the underscores solid amber.

Project titles ease forward slightly on hover or keyboard focus. Section numbers,
button arrows and download icons make a short spring movement on interaction;
the Colour Snap strip responds in a small stagger. These effects are decorative,
keep the layout fixed, and are disabled with reduced motion. Navigation uses
colour and a fine underline rather than moving the toolbar or its labels.

## Photography

Three equal album columns on wide screens, two on tablets and one on phones.
Covers reserve their space before loading, with a restrained hover zoom and SVG
arrows. Title and gallery link remain available if the image host fails. Native
`details` holds the public metadata and a link to the uncropped cover; it starts
closed and remains usable without JavaScript. Follow the Pixieset homepage order
unless explicitly changed. Do not invent dates or EXIF. See
`scripts/PHOTOGRAPHY.md` for generation and the current refresh limitation.

Photography’s title comes into focus word by word in 700ms, using opacity and
blur without moving the heading. Album details animate their actual height and
fade the contents on both opening and closing. Rapid toggles reverse from the
current frame; resize or reduced-motion changes settle immediately. Native
keyboard and no-JavaScript disclosure behavior stays available. Other pages
retain their existing title entrances; the navigation bar remains stationary.
