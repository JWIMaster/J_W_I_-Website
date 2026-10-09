/* ============================================================================
   Visual consistency harness.

   For every page x viewport it extracts the *computed* metrics of equivalent
   components, then prints, per metric, every distinct value with the pages it
   came from. Two pages disagreeing on a metric that should be shared is a
   defect; one page having a component the others lack is usually deliberate.
   ========================================================================== */
const { chromium } = require('playwright');
const fs = require('fs');

const BASE = 'http://127.0.0.1:8123';
const OUT = '.qa/polish';
fs.mkdirSync(OUT, { recursive: true });

const PAGES = [
  { k: 'index', u: 'index.html' },
  { k: 'swift', u: 'swiftios6.html' },
  { k: 'guide', u: 'swiftonios6guidepart1.html' },
  { k: 'support', u: 'support.html' },
];
const VIEWS = [
  { k: 'w1920', w: 1920, h: 1080 },
  { k: 'w1440', w: 1440, h: 900 },
  { k: 'w1280', w: 1280, h: 800 },
  { k: 'w1024', w: 1024, h: 768 },
  { k: 't834', w: 834, h: 1112 },
  { k: 't768', w: 768, h: 1024 },
  { k: 't640', w: 640, h: 900 },
  { k: 'n560', w: 560, h: 900 },
  { k: 'n480', w: 480, h: 900 },
  { k: 'n430', w: 430, h: 932 },
  { k: 'n390', w: 390, h: 844 },
  { k: 'n360', w: 360, h: 800 },
  { k: 'n320', w: 320, h: 568 },
];

const MEASURE = () => {
  const px = (v) => Math.round((parseFloat(v) || 0) * 100) / 100;
  const cs = (el) => (el ? getComputedStyle(el) : null);
  const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { l: Math.round(r.left), r: Math.round(r.right), w: Math.round(r.width), h: Math.round(r.height) }; };
  const sel = (s) => document.querySelector(s);
  const one = (s, props) => {
    const el = sel(s);
    if (!el) return null;
    const c = cs(el);
    const o = {};
    props.forEach((p) => { o[p] = c[p]; });
    o._box = box(el);
    return o;
  };
  const out = {};

  /* page frame */
  const body = cs(document.body);
  out.bodyPadL = body.paddingLeft;
  out.bodyPadR = body.paddingRight;
  const cont = sel('.container');
  out.container = cont ? { ref: sel('main.container') ? 'main' : 'other', w: box(cont).w, l: box(cont).l, max: cs(cont).maxWidth } : null;

  /* first and last content edges of <main> children */
  const main = sel('main');
  if (main) {
    const kids = [...main.children].filter((el) => el.getBoundingClientRect().height > 0);
    out.firstKid = kids.length ? { cls: kids[0].className, l: box(kids[0]).l, w: box(kids[0]).w } : null;
    out.lastKid = kids.length ? { cls: kids[kids.length - 1].className, r: box(kids[kids.length - 1]).r } : null;
  }

  /* masthead + nav */
  out.mast = one('.masthead', ['backgroundColor', 'borderBottomWidth', 'borderBottomColor', 'boxShadow']);
  out.mastInner = one('.mast-inner', ['height', 'paddingLeft', 'paddingRight', 'gap', 'maxWidth']);
  out.brand = one('.brand', ['fontSize', 'fontWeight', 'letterSpacing']);
  out.navLink = one('.nav a', ['fontSize', 'fontWeight', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'color']);
  out.nav = one('.nav', ['gap', 'paddingLeft', 'paddingRight', 'justifyContent', 'marginLeft', 'overflowX']);
  const navA = sel('.nav a[aria-current="page"]');
  if (navA) { const c = cs(navA, '::after'); out.navActiveAfter = { h: c.height, bg: c.backgroundColor, bottom: c.bottom, transform: c.transform }; }

  /* page head + section heads */
  out.pageHead = one('.page-head', ['maxWidth', 'gap', 'marginTop', 'marginBottom']);
  out.pageH1 = one('.page-head h1', ['fontSize', 'fontWeight', 'letterSpacing', 'lineHeight']);
  out.lede = one('.page-head .lede', ['fontSize', 'lineHeight', 'maxWidth', 'color']);
  out.kicker = one('.kicker', ['fontSize', 'fontWeight', 'letterSpacing', 'textTransform', 'color']);
  out.sectionHead = one('.section-head', ['gap', 'marginBottom']);
  out.sectionTitle = one('.section-title', ['fontSize', 'fontWeight', 'letterSpacing', 'lineHeight']);
  out.h2generic = one('main h2:not(.section-title)', ['fontSize', 'fontWeight', 'letterSpacing', 'lineHeight', 'marginTop', 'marginBottom']);

  /* controls */
  out.btn = one('.btn', ['fontSize', 'fontWeight', 'letterSpacing', 'borderRadius', 'borderWidth', 'paddingLeft', 'paddingRight', 'minHeight', 'color', 'backgroundColor', 'boxShadow']);
  out.btnSm = one('.btn-sm', ['fontSize', 'minHeight', 'borderRadius', 'paddingLeft', 'paddingRight']);
  out.btnPrimary = one('.btn-primary', ['color', 'backgroundColor', 'borderColor', 'boxShadow']);
  out.btnGhost = one('.btn-ghost', ['color', 'backgroundColor', 'borderColor', 'boxShadow']);
  out.btnDisabled = one('.btn:disabled', ['opacity']);

  /* home components */
  out.tocCell = one('.toc a', ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'borderLeftWidth', 'columnGap', 'rowGap']);
  out.tocList = one('.toc-list', ['gridTemplateColumns', 'borderTopWidth']);
  out.tocNum = one('.toc .n', ['fontSize', 'lineHeight', 'color']);
  out.tocTitle = one('.toc .t', ['fontSize', 'fontWeight', 'letterSpacing']);
  out.tocDesc = one('.toc .d', ['fontSize', 'lineHeight', 'color']);
  out.indexRow = one('.index-row', ['paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'columnGap', 'rowGap', 'gridTemplateColumns', 'borderRadius']);
  out.index = one('.index', ['borderTopWidth', 'borderBottomWidth', 'gap', 'backgroundColor']);
  out.indexNum = one('.index-num', ['fontSize', 'letterSpacing', 'color']);
  out.indexTitle = one('.index-title', ['fontSize', 'fontWeight', 'letterSpacing']);
  out.indexDesc = one('.index-desc', ['fontSize', 'color', 'maxWidth', 'marginTop']);
  out.hero = one('.hero', ['columnGap', 'rowGap', 'marginTop', 'marginBottom', 'paddingBottom', 'alignItems']);
  out.heroName = one('.hero-name', ['fontSize', 'fontWeight', 'letterSpacing', 'lineHeight', 'color']);
  out.heroTag = one('.hero-tagline', ['fontSize', 'lineHeight', 'maxWidth', 'color']);

  /* reading + guide components */
  out.sheet = one('.sheet', ['maxWidth', 'borderRadius', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'color']);
  out.sheetPad = one('.sheet-pad', ['paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom']);
  out.prose = one('.prose', ['fontSize', 'lineHeight', 'maxWidth', 'color']);
  out.proseP = one('.prose > p', ['fontSize', 'lineHeight', 'marginTop']);
  out.code = one('.code', ['borderRadius', 'marginTop', 'marginBottom']);
  out.codeBar = one('.code-bar', ['paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'borderRadius', 'gap']);
  out.codeTitle = one('.code-title', ['fontSize', 'letterSpacing', 'color']);
  out.codeScreen = one('.code-screen', ['paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'borderRadius', 'backgroundColor']);
  out.codePre = one('.code-screen pre', ['fontSize', 'lineHeight', 'color']);
  out.shot = one('.shot', ['paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'borderRadius', 'marginTop']);
  out.stepBadge = one('.step-badge', ['fontSize', 'fontWeight', 'borderRadius']);
  out.stepBodyH3 = one('.step-body h3', ['fontSize', 'fontWeight', 'letterSpacing', 'marginBottom']);
  out.stepBodyP = one('.step-body p', ['fontSize', 'lineHeight', 'color', 'maxWidth']);
  out.osCard = one('.os-card', ['paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'borderRadius', 'columnGap', 'rowGap', 'borderWidth']);
  out.osName = one('.os-name', ['fontSize', 'fontWeight']);
  out.osVer = one('.os-ver', ['fontSize', 'letterSpacing', 'color']);
  out.dlRow = one('.dl-list .dl-row', ['paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'borderRadius', 'gap']);
  out.dlName = one('.dl-name', ['fontSize', 'fontWeight']);
  out.dlSrc = one('.dl-src', ['fontSize', 'letterSpacing', 'paddingTop', 'paddingBottom', 'borderRadius']);
  out.dlList = one('.dl-list', ['maxWidth', 'gap', 'fontSize', 'marginTop']);
  out.wizProgress = one('.wiz-progress', ['fontSize', 'letterSpacing', 'color', 'gap']);
  out.wizControls = one('.wiz-controls', ['gap', 'paddingTop', 'marginTop', 'borderTopWidth']);
  out.wizConfirmSpan = one('.wiz-confirm .confirm span', ['fontSize', 'color']);

  /* support */
  out.contactPanel = one('.contact-panel', ['paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'borderTopWidth', 'borderBottomWidth', 'gap', 'maxWidth']);
  out.contactLabel = one('.contact-label', ['fontSize', 'letterSpacing', 'color']);
  out.contactEmail = one('.contact-email', ['fontSize', 'fontWeight', 'color']);

  /* footer */
  out.foot = one('.site-foot', ['marginTop', 'paddingTop', 'paddingBottom', 'borderTopWidth']);
  out.footInner = one('.foot-inner', ['gap', 'paddingLeft', 'paddingRight']);
  out.footBrand = one('.foot-brand', ['fontSize', 'fontWeight', 'color']);
  out.footLink = one('.foot-links a', ['fontSize', 'color', 'paddingTop', 'paddingBottom']);
  out.footCopy = one('.foot-copy', ['fontSize', 'color', 'width']);

  /* overflow + focus sanity */
  const de = document.documentElement;
  out.docOverflow = de.scrollWidth - de.clientWidth;
  out.pageH = de.scrollHeight;
  return out;
};

(async () => {
  const only = process.argv[2];
  const browser = await chromium.launch();
  const rows = [];
  for (const v of VIEWS) {
    if (only && v.k !== only) continue;
    for (const pg of PAGES) {
      const ctx = await browser.newContext({ viewport: { width: v.w, height: v.h } });
      const p = await ctx.newPage();
      try {
        await p.goto(BASE + '/' + pg.u, { waitUntil: 'networkidle', timeout: 30000 });
        await p.evaluate(() => (document.fonts ? document.fonts.ready : Promise.resolve())).catch(() => {});
        await p.waitForTimeout(220);
        await p.evaluate(async () => { const de = document.documentElement; for (let y = 0; y <= de.scrollHeight; y += 700) { window.scrollTo({ top: y, behavior: 'instant' }); await new Promise((r) => setTimeout(r, 25)); } window.scrollTo(0, 0); });
        await p.waitForTimeout(260);
        rows.push({ view: v.k, page: pg.k, m: await p.evaluate(MEASURE) });
      } catch (e) {
        rows.push({ view: v.k, page: pg.k, error: String(e.message).slice(0, 120) });
      }
      await ctx.close();
    }
  }
  await browser.close();
  fs.writeFileSync(`${OUT}/metrics.json`, JSON.stringify(rows, null, 1));

  /* ---- aggregate: per view, per metric, which distinct values appear ---- */
  const views = [...new Set(rows.map((r) => r.view))];
  const key = (o) => {
    if (o === null || o === undefined) return 'absent';
    if (typeof o !== 'object') return String(o);
    const c = Object.assign({}, o);
    delete c._box;
    return JSON.stringify(c);
  };
  const lines = [];
  for (const v of views) {
    const rs = rows.filter((r) => r.view === v && !r.error);
    const metrics = new Set();
    rs.forEach((r) => Object.keys(r.m).forEach((k) => metrics.add(k)));
    const bad = [];
    for (const mt of metrics) {
      const groups = {};
      for (const r of rs) {
        const val = key(r.m[mt]);
        if (val === 'absent') continue;
        (groups[val] = groups[val] || []).push(r.page);
      }
      const vals = Object.keys(groups);
      if (vals.length > 1) {
        bad.push('  ' + mt + '\n' + vals.map((x) => '      ' + x + '   <- ' + groups[x].join(',')).join('\n'));
      }
    }
    lines.push('### ' + v + '  (' + rs.length + ' pages)' + (bad.length ? '\n' + bad.join('\n') : '\n  no divergence'));
  }
  const errors = rows.filter((r) => r.error);
  if (errors.length) lines.push('\nERRORS:\n' + errors.map((e) => '  ' + e.view + ' ' + e.page + ': ' + e.error).join('\n'));
  const txt = lines.join('\n\n');
  fs.writeFileSync(`${OUT}/divergence.txt`, txt);
  console.log(txt.slice(0, 12000));
  console.log('\n--- saved to ' + OUT + '/divergence.txt (' + txt.length + ' chars) ---');
})().catch((e) => { console.error(e); process.exit(1); });
