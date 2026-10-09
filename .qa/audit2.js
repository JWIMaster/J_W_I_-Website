/* ============================================================================
   Fresh independent responsive/UI audit (round 14).
   Deliberately re-derives everything from scratch; it does not read the
   previous round's JSON.

   Modes:  sweep | zoom | resize | scroll | motion | interact
   Usage:  node .qa/audit2.js <mode>   ->  .qa/a2/<mode>.json

   Measurements are taken in the live viewport (never via fullPage capture,
   which rasterises not-yet-revealed .fade-io layers as blank fills).
   ========================================================================== */
const { chromium } = require('playwright');
const fs = require('fs');

const BASE = 'http://127.0.0.1:8123';
const OUT = '.qa/a2';
fs.mkdirSync(OUT, { recursive: true });

const PAGES = [
  { key: 'index', url: 'index.html' },
  { key: 'swift', url: 'swiftios6.html' },
  { key: 'guide', url: 'swiftonios6guidepart1.html' },
  { key: 'support', url: 'support.html' },
];

/* device-height pairs that make sense for each width */
const HEIGHT = (w) => (w >= 1024 ? Math.round(w * 0.625) : w >= 700 ? Math.round(w * 0.75) : w >= 500 ? 800 : w >= 400 ? 844 : 568);

const SWEEP_W = [1920, 1728, 1440, 1280, 1120, 1024, 960, 900, 860, 800, 768, 720, 700, 640, 600, 560, 500, 450, 430, 414, 400, 390, 375, 360, 320];
const ZOOM_W = [1920, 1440, 1280, 1024, 768, 430, 390, 360, 320];
const ZOOMS = [50, 67, 80, 90, 100, 110, 125, 150, 175, 200];

/* ---------------------------------------------------------------- probe ---- */
/* Runs in the page. Returns one flat record; never throws. */
function PROBE() {
  const de = document.documentElement;
  const vw = de.clientWidth;
  const out = { vw, vh: window.innerHeight, scrollY: Math.round(window.scrollY) };
  const S = (el) => { try { return getComputedStyle(el); } catch (e) { return null; } };
  const R = (el) => el.getBoundingClientRect();
  const brief = (el) => {
    if (!el) return 'null';
    let s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    const c = (typeof el.className === 'string' ? el.className : '').trim().split(/\s+/).filter(Boolean).slice(0, 2).join('.');
    if (c) s += '.' + c;
    return s;
  };
  /* a horizontal scroller the design intends (code blocks, wide tables, nav row) */
  const SCROLLER = '.code-screen, pre, .table-scroll, .nav, .wiz-nav-scroll';
  const inIntentionalScroller = (el) => {
    let a = el;
    while (a && a !== de) {
      if (a.matches && a.matches(SCROLLER)) {
        const cs = S(a);
        if (cs && (cs.overflowX === 'auto' || cs.overflowX === 'scroll')) return true;
      }
      a = a.parentElement;
    }
    return false;
  };

  /* --- document-level overflow ------------------------------------------- */
  out.docOverflowX = de.scrollWidth - de.clientWidth;
  out.bodyOverflowX = document.body.scrollWidth - document.body.clientWidth;

  /* --- element-level horizontal offenders -------------------------------- */
  const off = [];
  document.querySelectorAll('body *').forEach((el) => {
    const cs = S(el);
    if (!cs || cs.display === 'none' || cs.visibility === 'hidden') return;
    const r = R(el);
    if (r.width === 0 || r.height === 0) return;
    if (r.right > vw + 1 || r.left < -1) {
      if (inIntentionalScroller(el)) return;
      off.push(brief(el) + ' l=' + Math.round(r.left) + ' r=' + Math.round(r.right));
    }
  });
  out.offscreen = off.slice(0, 10);
  out.offscreenN = off.length;

  /* --- text-node overflow (catches text that escapes its box) ------------ */
  const tin = [];
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      const p = n.parentElement;
      if (!p) return NodeFilter.FILTER_REJECT;
      const cs = S(p);
      if (!cs || cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return NodeFilter.FILTER_REJECT;
      if (inIntentionalScroller(p)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let n;
  while ((n = walk.nextNode())) {
    let rg;
    try { rg = document.createRange(); rg.selectNodeContents(n); } catch (e) { continue; }
    const rects = rg.getClientRects();
    for (const rc of rects) {
      if (rc.width === 0) continue;
      if (rc.right > vw + 1 || rc.left < -1) {
        const p = n.parentElement;
        const host = p.closest('.index-row, .step, .card, li, p, h1, h2, h3, a, td, .toc-list') || p;
        tin.push(brief(host) + ' "' + n.nodeValue.trim().slice(0, 26) + '" l=' + Math.round(rc.left) + ' r=' + Math.round(rc.right));
        break;
      }
    }
    if (tin.length > 8) break;
  }
  out.textOverflow = tin;
  out.textOverflowN = tin.length;

  /* --- buttons: line count, size, tap target ----------------------------- */
  const btns = [];
  document.querySelectorAll('.btn, button, .os-card, .path-card, a.nav-link').forEach((el) => {
    const cs = S(el);
    if (!cs || cs.display === 'none' || cs.visibility === 'hidden') return;
    const r = R(el);
    if (r.width === 0) return;
    const lh = parseFloat(cs.lineHeight) || 20;
    const padV = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
    const inner = Math.max(0, r.height - padV - (parseFloat(cs.borderTopWidth) || 0) * 2);
    btns.push({
      t: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30),
      w: Math.round(r.width), h: Math.round(r.height),
      lines: Math.max(1, Math.round(inner / lh)),
      fs: Math.round((parseFloat(cs.fontSize) || 0) * 10) / 10,
    });
  });
  out.btns = btns;
  out.btnMulti = btns.filter((b) => b.lines > 1).map((b) => b.t + '(' + b.w + 'px,' + b.lines + 'L)');
  out.btnSmall = btns.filter((b) => b.h < 32 || b.w < 32).map((b) => b.t + '(' + b.w + 'x' + b.h + ')');

  /* --- clipped / truncated text ------------------------------------------ */
  const clip = [];
  document.querySelectorAll('body *').forEach((el) => {
    const cs = S(el);
    if (!cs || cs.display === 'none') return;
    if (el.children.length) return;           /* leaf blocks only */
    if (!(el.textContent || '').trim()) return;
    if (cs.overflow === 'hidden' || cs.overflowY === 'hidden' || cs.textOverflow === 'ellipsis') {
      if (el.scrollHeight > el.clientHeight + 2 || el.scrollWidth > el.clientWidth + 2) {
        clip.push(brief(el) + ' "' + el.textContent.trim().slice(0, 22) + '" ' + el.scrollWidth + 'x' + el.scrollHeight + ' in ' + el.clientWidth + 'x' + el.clientHeight);
      }
    }
  });
  out.clipped = clip.slice(0, 8);
  out.clippedN = clip.length;

  /* --- tiny text ---------------------------------------------------------- */
  const tiny = [];
  const seen = new Set();
  document.querySelectorAll('body *').forEach((el) => {
    if (el.children.length) return;
    const cs = S(el);
    if (!cs || cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return;
    if (!(el.textContent || '').trim()) return;
    const fs = parseFloat(cs.fontSize) || 0;
    if (fs < 11.5) { const k = brief(el) + fs; if (!seen.has(k)) { seen.add(k); tiny.push(brief(el) + ' ' + fs + 'px'); } }
  });
  out.tinyText = tiny.slice(0, 8);
  out.tinyTextN = tiny.length;

  /* --- masthead + wizard geometry ---------------------------------------- */
  const mast = document.querySelector('.masthead');
  const wiz = document.querySelector('#wizard') || document.querySelector('.wizard-shell');
  out.mastHVar = S(de).getPropertyValue('--mast-h').trim();
  if (mast) { const r = R(mast); out.mast = { t: Math.round(r.top), b: Math.round(r.bottom), h: Math.round(r.height) }; }
  if (wiz) {
    const r = R(wiz);
    out.wiz = { t: Math.round(r.top), b: Math.round(r.bottom), h: Math.round(r.height), vis: S(wiz).display !== 'none' };
    if (mast) out.wizGap = Math.round((r.top - R(mast).bottom) * 10) / 10;
  }
  /* does the sticky mast cover content when scrolled? */
  out.mastOverlap = null;
  if (mast && window.scrollY > 20) {
    const mb = R(mast).bottom;
    let hit = null;
    document.querySelectorAll('main *').forEach((el) => {
      if (hit || el.children.length > 2) return;
      const txt = (el.textContent || '').trim();
      if (!txt) return;
      const r = R(el);
      if (r.height > 0 && r.top < mb - 2 && r.bottom > mb && r.width > 0) hit = brief(el);
    });
    out.mastOverlap = hit;
  }

  /* --- nav ----------------------------------------------------------------- */
  const nav = document.querySelector('.nav');
  if (nav) {
    const cs = S(nav);
    out.nav = { sw: nav.scrollWidth, cw: nav.clientWidth, overflow: cs.overflowX, scrollable: nav.scrollWidth > nav.clientWidth + 1 };
  }

  /* --- images -------------------------------------------------------------- */
  const imgs = [];
  document.querySelectorAll('img').forEach((i) => {
    const r = R(i);
    imgs.push({ src: (i.getAttribute('src') || '').split('/').pop().slice(0, 40), ok: i.complete && i.naturalWidth > 0, w: Math.round(r.width), h: Math.round(r.height), nw: i.naturalWidth });
  });
  out.imgsBroken = imgs.filter((i) => !i.ok).map((i) => i.src);
  out.imgsUnsized = imgs.filter((i) => i.ok && (!i.w || !i.h)).map((i) => i.src);
  out.imgs = imgs.length;
  /* images with no width/height attribute (layout shift risk) */
  out.imgsNoAttr = [...document.querySelectorAll('img')].filter((i) => !i.getAttribute('width') || !i.getAttribute('height')).length;

  /* --- content actually visible? (reveal system sanity) -------------------- */
  let hiddenText = 0;
  document.querySelectorAll('.fade-io, .reveal, .tw-rest, .tw-lead').forEach((el) => {
    const cs = S(el);
    if (cs && parseFloat(cs.opacity) < 0.05 && (el.textContent || '').trim()) hiddenText++;
  });
  out.hiddenTextBlocks = hiddenText;
  out.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --- heading structure ---------------------------------------------------- */
  out.h1 = [...document.querySelectorAll('h1')].map((h) => (h.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40));
  out.headingJumps = 0;
  let prev = 0;
  document.querySelectorAll('h1,h2,h3,h4').forEach((h) => {
    const lv = +h.tagName[1];
    if (prev && lv > prev + 1) out.headingJumps++;
    prev = lv;
  });

  out.pageH = de.scrollHeight;
  return out;
}

/* --------------------------------------------------------------- driver ---- */
async function record(browser, { url, w, h, zoom, wiz, reduced, nojs, prep, scrollTo }) {
  const vw = zoom && zoom !== 100 ? Math.max(160, Math.round((w * 100) / zoom)) : w;
  const ctx = await browser.newContext({
    viewport: { width: vw, height: Math.max(240, Math.round(h * (zoom && zoom !== 100 ? 100 / zoom : 1))) },
    deviceScaleFactor: 1,
    reducedMotion: reduced ? 'reduce' : 'no-preference',
  });
  const p = await ctx.newPage();
  const errs = [];
  const failed = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)); });
  p.on('pageerror', (e) => errs.push('pageerror: ' + e.message.slice(0, 160)));
  p.on('requestfailed', (r) => failed.push(r.url().split('/').pop().slice(0, 60)));
  let rec = { url, W: w, H: h, zoom: zoom || 100, vw, wiz: !!wiz, reduced: !!reduced, nojs: !!nojs };
  try {
    await p.goto(BASE + '/' + url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    if (nojs) { await p.addInitScript(() => {}); }
    await p.evaluate(() => (document.fonts ? document.fonts.ready : Promise.resolve())).catch(() => {});
    await p.waitForTimeout(280);
    if (prep) await prep(p);
    /* settle reveals so measurements are of the real, visible state */
    await p.evaluate(async () => {
      const de = document.documentElement;
      for (let y = 0; y <= de.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
      window.scrollTo(0, 0);
    });
    await p.waitForTimeout(420);
    if (typeof scrollTo === 'number') { await p.evaluate((y) => window.scrollTo(0, y), scrollTo); await p.waitForTimeout(260); }
    rec = Object.assign(rec, await p.evaluate(PROBE));
  } catch (e) {
    rec.fatal = String(e.message || e).slice(0, 200);
  }
  rec.console = errs.slice(0, 5);
  rec.failed = failed.slice(0, 5);
  await ctx.close();
  return rec;
}

const openWizard = async (p) => {
  await p.click('.os-card:has-text("Monterey")').catch(() => {});
  await p.waitForTimeout(700);
};

(async () => {
  const mode = process.argv[2] || 'sweep';
  const browser = await chromium.launch();
  const recs = [];
  const t0 = Date.now();

  if (mode === 'sweep') {
    for (const pg of PAGES) for (const w of SWEEP_W) {
      recs.push(await record(browser, { url: pg.url, w, h: HEIGHT(w) }));
    }
    for (const w of [1440, 1024, 390, 320]) recs.push(await record(browser, { url: 'swiftonios6guidepart1.html', w, h: HEIGHT(w), wiz: true, prep: openWizard }));
  }

  if (mode === 'zoom') {
    for (const pg of PAGES) for (const w of ZOOM_W) for (const z of ZOOMS) {
      recs.push(await record(browser, { url: pg.url, w, h: HEIGHT(w), zoom: z }));
    }
  }

  if (mode === 'resize') {
    const seqs = [
      { from: [1440, 900], to: [[1024, 768], [768, 1024], [430, 932], [320, 568], [1440, 900]] },
      { from: [390, 844], to: [[320, 568], [430, 932], [768, 1024], [1440, 900], [320, 568]] },
      { from: [1920, 1080], to: [[1280, 800], [900, 700], [600, 800], [375, 812], [1920, 1080]] },
    ];
    for (const pg of PAGES) for (const seq of seqs) {
      const ctx = await browser.newContext({ viewport: { width: seq.from[0], height: seq.from[1] } });
      const p = await ctx.newPage();
      const errs = [];
      p.on('pageerror', (e) => errs.push(String(e.message).slice(0, 120)));
      try {
        await p.goto(BASE + '/' + pg.url, { waitUntil: 'domcontentloaded' });
        await p.evaluate(() => (document.fonts ? document.fonts.ready : Promise.resolve())).catch(() => {});
        await p.waitForTimeout(400);
        if (pg.url.includes('guide')) await openWizard(p);
        for (const [w, h] of seq.to) {
          await p.setViewportSize({ width: w, height: h });
          await p.waitForTimeout(380);
          const r = await p.evaluate(PROBE);
          recs.push(Object.assign({ url: pg.url, from: seq.from.join('x'), to: w + 'x' + h, W: w, H: h, zoom: 100 }, r));
        }
      } catch (e) { recs.push({ url: pg.url, fatal: String(e.message).slice(0, 160) }); }
      if (errs.length) recs[recs.length - 1].console = errs;
      await ctx.close();
    }
  }

  if (mode === 'scroll') {
    for (const pg of PAGES) for (const [w, h] of [[1440, 900], [1024, 768], [768, 1024], [430, 932], [390, 844], [320, 568]]) {
      for (const stop of ['top', 'mid', 'bottom']) {
        const r = await record(browser, {
          url: pg.url, w, h, scrollTo: 0, prep: async (p) => {
            if (stop === 'bottom') await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
            if (stop === 'mid') await p.evaluate(() => window.scrollTo(0, Math.round(document.documentElement.scrollHeight / 2)));
            await p.waitForTimeout(200);
          },
        });
        r.stop = stop;
        recs.push(r);
      }
    }
    /* the wizard page scrolled (sticky masthead + fixed shell interaction) */
    for (const [w, h] of [[1024, 768], [390, 844], [320, 568]]) {
      for (const stop of ['top', 'bottom']) {
        const r = await record(browser, {
          url: 'swiftonios6guidepart1.html', w, h, wiz: true, prep: async (p) => {
            await openWizard(p);
            if (stop === 'bottom') await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
            await p.waitForTimeout(220);
          },
        });
        r.stop = 'wiz-' + stop;
        recs.push(r);
      }
    }
  }

  if (mode === 'motion') {
    for (const pg of PAGES) for (const w of [1440, 390, 320]) {
      recs.push(await record(browser, { url: pg.url, w, h: HEIGHT(w), reduced: true }));
    }
    /* no-JS: everything must still be readable and un-clipped */
    for (const pg of PAGES) for (const w of [1440, 390]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: HEIGHT(w) }, javaScriptEnabled: false });
      const p = await ctx.newPage();
      let r = { url: pg.url, W: w, nojs: true };
      try {
        await p.goto(BASE + '/' + pg.url, { waitUntil: 'domcontentloaded' });
        await p.waitForTimeout(500);
        r = Object.assign(r, await p.evaluate(() => {
          const de = document.documentElement;
          const hidden = [...document.querySelectorAll('*')].filter((el) => {
            const cs = getComputedStyle(el);
            return (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.05) && (el.textContent || '').trim().length > 40;
          }).length;
          return {
            vw: de.clientWidth, docOverflowX: de.scrollWidth - de.clientWidth, pageH: de.scrollHeight,
            hiddenBlocks: hidden,
            visibleSteps: document.querySelectorAll('.wizard-step:not([hidden])').length,
            stepH: [...document.querySelectorAll('.wizard-step')].map((s) => Math.round(s.getBoundingClientRect().height)).slice(0, 30),
          };
        }));
      } catch (e) { r.fatal = String(e.message).slice(0, 160); }
      recs.push(r);
      await ctx.close();
    }
  }

  if (mode === 'interact') {
    /* functional + interaction audit, independent of the old suites */
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const p = await ctx.newPage();
    const log = (k, v) => recs.push({ check: k, result: v });
    p.on('pageerror', (e) => log('pageerror', String(e.message).slice(0, 160)));
    await p.goto(BASE + '/index.html', { waitUntil: 'networkidle' });
    /* every internal link resolves */
    const hrefs = await p.evaluate(() => [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')));
    const bad = [];
    for (const h of hrefs) {
      if (!h || h.startsWith('mailto:') || h.startsWith('http') || h.startsWith('#')) continue;
      const res = await p.request.get(BASE + '/' + h).catch(() => null);
      if (!res || res.status() >= 400) bad.push(h + ' -> ' + (res ? res.status() : 'ERR'));
    }
    log('brokenLinks', bad);
    log('linkCount', hrefs.length);
    /* copy buttons on the writeup page */
    await p.goto(BASE + '/swiftios6.html', { waitUntil: 'networkidle' });
    await p.evaluate(() => { window.__copied = null; navigator.clipboard.writeText = (t) => { window.__copied = t; return Promise.resolve(); }; });
    const copyBtns = await p.$$('[data-copy-target]');
    if (copyBtns.length) {
      await copyBtns[0].click();
      await p.waitForTimeout(250);
      const copied = await p.evaluate(() => window.__copied);
      const label = await copyBtns[0].textContent();
      log('copyButton', { n: copyBtns.length, copiedLen: copied ? copied.length : 0, labelAfter: label.trim() });
    } else log('copyButton', 'none found');
    /* anchors on the index */
    await p.goto(BASE + '/index.html', { waitUntil: 'networkidle' });
    const anchors = await p.$$eval('.toc-list a', (as) => as.map((a) => a.getAttribute('href')));
    const anchorBad = [];
    for (const a of anchors) {
      const ok = await p.evaluate((sel) => !!document.querySelector(sel), a);
      if (!ok) anchorBad.push(a);
    }
    log('tocAnchors', { n: anchors.length, bad: anchorBad });
    /* nav active state + underline alignment */
    await p.goto(BASE + '/support.html', { waitUntil: 'networkidle' });
    log('navActive', await p.evaluate(() => {
      const a = document.querySelector('.nav a[aria-current="page"]');
      return a ? a.textContent.trim() : null;
    }));
    /* wizard end-to-end (Monterey / manual path) */
    await p.goto(BASE + '/swiftonios6guidepart1.html', { waitUntil: 'networkidle' });
    await p.click('.os-card:has-text("Monterey")');
    await p.waitForTimeout(700);
    log('wizardOpen', await p.evaluate(() => {
      const w = document.querySelector('#wizard');
      return { vis: !!w && getComputedStyle(w).display !== 'none', step: document.querySelectorAll('.wizard-step:not([hidden])').length };
    }));
    let advanced = 0, blocked = 0;
    for (let i = 0; i < 40; i++) {
      /* #wiz-next is the stable handle: on confirmation steps its label is the
         confirmation text ("I've downloaded …"), not the word "Next" */
      const st = await p.evaluate(() => {
        const next = document.querySelector('#wiz-next');
        const cb = document.querySelector('.wizard-step:not(.is-hidden) .confirm-box');
        return {
          exists: !!next && !next.hidden,
          disabled: next ? next.disabled : null,
          armed: next ? next.classList.contains('is-armed') : null,
          label: next ? next.textContent.trim().replace(/\s+/g, ' ').slice(0, 34) : null,
          hasConfirm: !!cb,
        };
      });
      if (!st.exists) break;
      if (st.disabled) {
        blocked++;
        if (st.hasConfirm) {
          await p.click('.wizard-step:not(.is-hidden) .confirm-box', { force: true }).catch(() => {});
          await p.waitForTimeout(180);
        } else break;
      }
      await p.click('#wiz-next').catch(() => {});
      await p.waitForTimeout(260);
      advanced++;
    }
    log('wizardAdvance', { advanced, blockedStates: blocked });
    log('wizardGeometry', await p.evaluate(() => {
      const m = document.querySelector('.masthead').getBoundingClientRect();
      const w = document.querySelector('#wizard').getBoundingClientRect();
      return { mastBottom: Math.round(m.bottom), wizTop: Math.round(w.top), gap: Math.round((w.top - m.bottom) * 10) / 10, mastVar: getComputedStyle(document.documentElement).getPropertyValue('--mast-h').trim() };
    }));
    await ctx.close();
  }

  await browser.close();
  fs.writeFileSync(`${OUT}/${mode}.json`, JSON.stringify(recs, null, 1));
  console.log(mode, 'records:', recs.length, 'in', ((Date.now() - t0) / 1000).toFixed(1) + 's');
})().catch((e) => { console.error(e); process.exit(1); });
