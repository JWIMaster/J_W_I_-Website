'use strict';
/* Responsive audit harness.
 *
 * Modes:
 *   sweep   — every page × every test width (100% zoom): metrics + screenshots
 *   zoom    — representative widths × browser-zoom levels (emulated by CSS
 *             viewport W/zoom ≝ zoom on a W-px window, which is layout-equivalent)
 *   resize  — live 1920→320 and back with no reload (tests reflow transitions)
 *   scroll  — step-scroll the whole page at mobile widths (sticky/fixed + overflow)
 *
 * Browser zoom note: CDP Emulation.setPageScaleFactor does NOT change the layout
 * viewport in headless Chromium (probed: innerWidth unchanged at 200%). A window
 * zoomed to X% has layout viewport W/X, so we emulate by resizing the viewport —
 * the exact layout the real zoomed window would run.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'http://127.0.0.1:8123/';
const OUT = path.join(__dirname, 'resp');
fs.mkdirSync(OUT, { recursive: true });

const PAGES = [
  { id: 'index', url: 'index.html' },
  { id: 'swiftios6', url: 'swiftios6.html' },
  { id: 'support', url: 'support.html' },
  { id: 'guide', url: 'swiftonios6guidepart1.html' },
];

const WIDTHS = {
  // width: [height, isMobile]
  1920: [1080, false], 1440: [900, false], 1280: [800, false], 1024: [768, false],
  900: [700, false], 800: [800, false], 700: [700, false], 600: [800, false],
  500: [800, false], 450: [800, false], 400: [800, true],
  430: [932, true], 414: [896, true], 390: [844, true], 375: [812, true],
  360: [800, true], 320: [568, true],
};
const ALL_W = Object.keys(WIDTHS).map(Number).sort((a, b) => a - b);

/* ---------- in-page measurement ---------- */
const MEASURE = () => {
  const de = document.documentElement;
  const vw = de.clientWidth;
  const sw = de.scrollWidth;
  const bw = document.body ? document.body.scrollWidth : 0;
  const out = { vw, sw, bw, overflow: sw > vw + 1 || bw > vw + 1 };
  out.mq = [860, 719, 640, 560, 480].map((bp) => (matchMedia('(max-width:' + bp + 'px)').matches ? bp : 0)).filter(Boolean);
  const body = document.body;
  out.css = {
    bodyPadL: body ? getComputedStyle(body).paddingLeft : null,
    mastHVar: getComputedStyle(de).getPropertyValue('--mast-h').trim() || null,
  };
  const R = (el) => { const b = el.getBoundingClientRect(); return { l: Math.round(b.left), r: Math.round(b.right), t: Math.round(b.top), b: Math.round(b.bottom), w: Math.round(b.width), h: Math.round(b.height) }; };
  const sel = (el) => {
    let s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    const c = el.getAttribute && el.getAttribute('class');
    if (c) s += '.' + c.trim().split(/\s+/).join('.');
    return s;
  };
  const mast = document.querySelector('.masthead');
  const nav = document.querySelector('.nav');
  out.mast = mast ? Object.assign(R(mast), { h: mast.offsetHeight }) : null;
  if (nav) {
    const nrb = nav.getBoundingClientRect();
    const a = nav.querySelector('a[aria-current="page"]');
    const arb = a && a.getBoundingClientRect();
    out.nav = {
      sw: nav.scrollWidth, cw: nav.clientWidth,
      l: Math.round(nrb.left), w: Math.round(nrb.width),
      active: a ? { l: Math.round(arb.left - nrb.left), r: Math.round(arb.right - nrb.left), inView: arb.left >= nrb.left - 1 && arb.right <= nrb.right + 1 } : null,
      linkW: Array.from(nav.querySelectorAll('a')).map((x) => Math.round(x.getBoundingClientRect().width)),
    };
  }
  // wizard app frame vs masthead (overlap check)
  const wiz = document.querySelector('#wizard');
  if (wiz && mast) {
    out.wizGap = Math.round(wiz.getBoundingClientRect().top - mast.getBoundingClientRect().bottom);
  }
  // horizontal-overflow culprits: border-box past the viewport, not contained by a
  // scroller that itself stays inside the viewport (intentional internal scroll)
  const contained = (el) => {
    let a = el.parentElement;
    while (a) {
      const o = getComputedStyle(a);
      if (/(auto|scroll|hidden)/.test(o.overflowX)) {
        const srb = a.getBoundingClientRect();
        if (srb.right <= vw + 1 && srb.left >= -1) return true;
      }
      a = a.parentElement;
    }
    return false;
  };
  out.culprits = [];
  for (const el of document.querySelectorAll('body *')) {
    if (!el.offsetWidth && !el.offsetHeight) continue;
    const b = el.getBoundingClientRect();
    if ((b.right > vw + 1 || b.left < -1) && !contained(el)) {
      out.culprits.push({ s: sel(el).slice(0, 60), l: Math.round(b.left), r: Math.round(b.right), w: Math.round(b.width), h: Math.round(b.height) });
      if (out.culprits.length >= 15) break;
    }
  }
  const lines = (el) => (el ? el.getClientRects().length : 0);
  out.h1 = Array.from(document.querySelectorAll('h1')).map((el) => ({ t: el.textContent.trim().slice(0, 28), lines: lines(el) }));
  out.h2 = Array.from(document.querySelectorAll('h2')).map((el) => ({ t: el.textContent.trim().slice(0, 28), lines: lines(el) }));
  out.btns = Array.from(document.querySelectorAll('.btn')).map((el) => {
    const b = el.getBoundingClientRect();
    const fs = parseFloat(getComputedStyle(el).fontSize);
    return { t: el.textContent.trim().slice(0, 16), w: Math.round(b.width), h: Math.round(b.height), wrapped: b.height > fs * 1.9 };
  });
  out.scrollers = Array.from(document.querySelectorAll('.code-screen, .table-scroll, .wiz-viewport')).map((el) => ({
    s: sel(el).slice(0, 30), sw: el.scrollWidth, cw: el.clientWidth, sh: el.scrollHeight, ch: el.clientHeight, cls: el.className,
  }));
  const wv = document.querySelector('.wiz-viewport');
  if (wv) out.wv = { sh: wv.scrollHeight, ch: wv.clientHeight, st: Math.round(wv.scrollTop), cls: wv.className };
  const vis = Array.from(document.querySelectorAll('.wizard-step:not(.is-hidden)'));
  out.wizSteps = vis.map((el) => el.getAttribute('data-step') + (el.getAttribute('data-os') ? ':' + el.getAttribute('data-os') : '') + (el.getAttribute('data-path') ? ':' + el.getAttribute('data-path') : ''));
  out.imgs = Array.from(document.querySelectorAll('img')).filter((el) => el.offsetWidth > 0).map((el) => {
    const b = el.getBoundingClientRect();
    const f = el.closest('.shot, figure, .figure');
    const fb = f && f.getBoundingClientRect();
    return { a: (el.getAttribute('alt') || el.src.split('/').pop()).slice(0, 20), w: Math.round(b.width), h: Math.round(b.height), out: fb ? (b.right > fb.right + 1 || b.left < fb.left - 1 || b.bottom > fb.bottom + 1 || b.top < fb.top - 1) : null };
  });
  out.rows = Array.from(document.querySelectorAll('.index-row')).map((el) => { const b = el.getBoundingClientRect(); return { l: Math.round(b.left), r: Math.round(b.right), w: Math.round(b.width) }; });
  out.cards = Array.from(document.querySelectorAll('.os-card, .path-card, .dl-row, .proj-card')).map((el) => { const b = el.getBoundingClientRect(); return { s: sel(el).slice(0, 40), w: Math.round(b.width), h: Math.round(b.height) }; });
  const fi = document.querySelector('.foot-inner');
  if (fi) out.foot = Array.from(fi.children).map((k) => ({ s: sel(k).slice(0, 26), t: Math.round(k.getBoundingClientRect().top) }));
  const cont = document.querySelector('main.container');
  if (cont) out.container = R(cont);
  return out;
};

/* ---------- helpers ---------- */
async function settle(page) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.evaluate(() => (document.fonts ? document.fonts.ready : Promise.resolve())).catch(() => {});
  await page.waitForTimeout(1300); // intro fade settles at 1.1s
}

async function revealAll(page) {
  // walk the page so every .fade-io fires, then return to top
  await page.evaluate(async () => {
    await new Promise((res) => {
      let y = 0;
      const step = () => {
        y += innerHeight * 0.6;
        scrollTo(0, y);
        if (y >= document.body.scrollHeight) { scrollTo(0, 0); setTimeout(res, 500); }
        else setTimeout(step, 110);
      };
      step();
    });
  });
  await page.waitForTimeout(500);
}

async function shot(page, name, full) {
  const p = path.join(OUT, name);
  await page.screenshot({ path: p, fullPage: !!full });
  return p;
}

async function newPage(browser, w, h, { js = true, mobile = false } = {}) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    deviceScaleFactor: 1,
    javaScriptEnabled: js,
    isMobile: mobile,
    hasTouch: mobile,
    reduceMotion: 'no-preference',
  });
  const page = await ctx.newPage();
  return { ctx, page };
}

/* Advance the wizard to a step key like "1:monterey" / "12:manual". */
async function gotoWizStep(page, key, maxIters = 26) {
  const read = () => page.evaluate(() => {
    const v = document.querySelector('.wizard-step:not(.is-hidden)');
    if (!v) return null;
    return v.getAttribute('data-step') +
      (v.getAttribute('data-os') ? ':' + v.getAttribute('data-os') : '') +
      (v.getAttribute('data-path') ? ':' + v.getAttribute('data-path') : '');
  });
  for (let i = 0; i < maxIters; i++) {
    const cur = await read();
    if (cur === null) return false;
    if (cur === key) return true;
    // decision step with path cards → pick Manual so we reach the manual branch
    const pathCard = await page.$('.wizard-step:not(.is-hidden) .path-card');
    if (pathCard) {
      const before = cur;
      await page.locator('.wizard-step:not(.is-hidden) .path-card', { hasText: 'Manual' }).click().catch(() => {});
      await page.waitForTimeout(300);
      if (await read() !== before) continue;
    }
    const before = cur;
    await page.click('#wiz-next').catch(() => {});
    await page.waitForTimeout(280);
    if ((await read()) === before) await page.click('#wiz-next').catch(() => {}); // confirm arm
    await page.waitForTimeout(280);
  }
  return (await read()) === key;
}

/* ---------- modes ---------- */
async function sweep(browser, results) {
  for (const pg of PAGES) {
    for (const w of ALL_W) {
      const [h, mobile] = WIDTHS[w];
      const { ctx, page } = await newPage(browser, w, h, { mobile });
      await page.goto(BASE + pg.url);
      await settle(page);
      const m = await page.evaluate(MEASURE);
      const rec = { mode: 'sweep', page: pg.id, w, h, z: 100, ...m };
      results.push(rec);
      const tag = `${pg.id}_${w}x${h}`;
      if (pg.id === 'guide') {
        await shot(page, `sweep_${tag}.png`);                       // app frame, step 0
        // walk to the downloads step + a shot step for geometry
        await page.locator('.os-card', { hasText: 'Monterey' }).click().catch(() => {});
        await page.waitForTimeout(350);
        await gotoWizStep(page, '12:manual');
        await page.waitForTimeout(400);
        await shot(page, `sweep_${tag}_s12.png`);
        const m2 = await page.evaluate(MEASURE);
        results.push({ mode: 'sweep', page: 'guide-s12', w, h, z: 100, ...m2 });
        // no-JS stacked fallback: full page
        const ctx2 = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, javaScriptEnabled: false, isMobile: mobile, hasTouch: mobile });
        const page2 = await ctx2.newPage();
        await page2.goto(BASE + pg.url);
        await page2.evaluate(() => document.fonts ? document.fonts.ready : Promise.resolve()).catch(() => {});
        await page2.waitForTimeout(400);
        const m3 = await page2.evaluate(MEASURE);
        results.push({ mode: 'sweep', page: 'guide-nojs', w, h, z: 100, ...m3 });
        const FULL = [1920, 1024, 800, 600, 500, 390, 320];
        if (FULL.includes(w)) await shot(page2, `sweep_${pg.id}_nojs_${tag}_full.png`, true);
        await ctx2.close();
      } else {
        await revealAll(page);
        await shot(page, `sweep_${tag}.png`);
        await shot(page, `sweep_${tag}_full.png`, true);
      }
      await ctx.close();
      process.stdout.write('.');
    }
  }
  console.log('\nsweep done: ' + results.length + ' records');
}

async function zoom(browser, results) {
  const ZS = [50, 67, 80, 90, 100, 110, 125, 150, 175, 200];
  const WS = [1920, 1024, 390, 320];
  for (const pg of PAGES) {
    for (const w of WS) {
      const [h, mobile] = WIDTHS[w];
      for (const z of ZS) {
        const w2 = Math.max(160, Math.round(w * 100 / z));
        const h2 = Math.max(200, Math.round(h * 100 / z));
        const { ctx, page } = await newPage(browser, w2, h2, { mobile });
        await page.goto(BASE + pg.url);
        await settle(page);
        const m = await page.evaluate(MEASURE);
        results.push({ mode: 'zoom', page: pg.id, w, h, z, effW: w2, effH: h2, ...m });
        await shot(page, `zoom_${pg.id}_${w}_${z}.png`);
        await ctx.close();
        process.stdout.write('.');
      }
    }
  }
  console.log('\nzoom done: ' + results.length + ' records');
}

async function resize(browser, results) {
  const STOPS = [1920, 1440, 1280, 1024, 900, 800, 700, 600, 500, 450, 430, 400, 390, 375, 360, 320];
  const SHOT = new Set([1920, 1440, 1024, 900, 800, 700, 600, 500, 450, 430, 400, 390, 375, 360, 320]);
  for (const pg of PAGES) {
    const mobile = false;
    for (const dir of ['down', 'up']) {
      const seq = dir === 'down' ? STOPS : [...STOPS].reverse();
      const { ctx, page } = await newPage(browser, 1920, 1080, { mobile });
      await page.goto(BASE + pg.url);
      await settle(page);
      if (pg.id !== 'guide') await revealAll(page);
      if (pg.id === 'guide') {
        await page.locator('.os-card', { hasText: 'Monterey' }).click().catch(() => {});
        await gotoWizStep(page, '12:manual').catch(() => {});
      }
      for (const w of seq) {
        const [h] = WIDTHS[w] || [1080, false];
        await page.setViewportSize({ width: w, height: dir === 'down' ? h : 1080 });
        await page.waitForTimeout(450); // let syncMast/resync + transitions settle
        const m = await page.evaluate(MEASURE);
        results.push({ mode: 'resize', page: pg.id, dir, w, ...m });
        if (SHOT.has(w)) await shot(page, `resize_${pg.id}_${dir}_${w}.png`);
        process.stdout.write('.');
      }
      await ctx.close();
    }
  }
  console.log('\nresize done: ' + results.length + ' records');
}

async function scroll(browser, results) {
  const SIZES = [[375, 812], [320, 568]];
  for (const pg of PAGES) {
    for (const [w, h] of SIZES) {
      const { ctx, page } = await newPage(browser, w, h, { mobile: true });
      await page.goto(BASE + pg.url);
      await settle(page);
      if (pg.id === 'guide') {
        await page.locator('.os-card', { hasText: 'Monterey' }).click().catch(() => {});
      }
      const stops = await page.evaluate(async () => {
        // count stops through the page (or the wiz-viewport in app mode)
        const app = document.body.classList.contains('wiz-app');
        const sh = app ? document.querySelector('.wiz-viewport') : null;
        const total = app ? sh.scrollHeight : document.body.scrollHeight;
        const view = app ? sh.clientHeight : innerHeight;
        const n = Math.min(14, Math.max(1, Math.ceil(total / (view * 0.55))));
        return { app, total, view, n };
      });
      const n = stops.n;
      for (let i = 0; i <= n; i++) {
        await page.evaluate(({ i, n, app }) => {
          const sh = app ? document.querySelector('.wiz-viewport') : null;
          const y = Math.round((sh || document).scrollHeight * (i / n));
          if (app) sh.scrollTop = y; else scrollTo(0, y);
        }, { i, n, app: stops.app });
        await page.waitForTimeout(320);
        const m = await page.evaluate(MEASURE);
        results.push({ mode: 'scroll', page: pg.id, w, h, stop: i, ...m });
        if (i % 2 === 0 || i === n) await shot(page, `scroll_${pg.id}_${w}_${i}.png`);
        process.stdout.write('.');
      }
      await ctx.close();
    }
  }
  console.log('\nscroll done: ' + results.length + ' records');
}

/* ---------- main ---------- */
(async () => {
  const mode = process.argv[2] || 'sweep';
  const fn = { sweep, zoom, resize, scroll }[mode];
  if (!fn) { console.error('unknown mode'); process.exit(2); }
  const browser = await chromium.launch();
  const results = [];
  const t0 = Date.now();
  await fn(browser, results);
  await browser.close();
  fs.writeFileSync(path.join(OUT, mode + '.json'), JSON.stringify(results, null, 1));
  console.log(`wrote ${mode}.json in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
})().catch((e) => { console.error(e); process.exit(1); });
