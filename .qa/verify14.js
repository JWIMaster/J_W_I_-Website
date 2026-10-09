const { chromium } = require('playwright');
const BASE = (process.env.JWI_PREVIEW_BASE || 'http://127.0.0.1:8123/').replace(/\/$/, '');
let pass = 0, fail = 0;
const ck = (name, ok, detail) => { (ok ? pass++ : fail++); console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? '  [' + detail + ']' : '')); };

(async () => {
  const b = await chromium.launch();

  /* 1 — BUG B: the natural flow that used to bleed the footer behind the shell */
  for (const [w, h] of [[1440, 900], [390, 844], [320, 568]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h } });
    const p = await ctx.newPage();
    await p.goto(BASE + '/swiftonios6guidepart1.html', { waitUntil: 'networkidle' });
    await p.evaluate(() => window.scrollTo({ top: 999, behavior: 'instant' }));   // reader scrolls to the picker
    await p.waitForTimeout(200);
    const preY = await p.evaluate(() => window.scrollY);
    await p.click('.os-card:has-text("Monterey")');
    await p.waitForTimeout(700);
    const r = await p.evaluate(() => {
      const m = document.querySelector('.masthead').getBoundingClientRect();
      const wz = document.querySelector('#wizard').getBoundingClientRect();
      const foot = document.querySelector('.site-foot');
      return { y: window.scrollY, gap: Math.round((wz.top - m.bottom) * 10) / 10, mastTop: Math.round(m.top),
               footShown: foot ? getComputedStyle(foot).display !== 'none' && foot.getClientRects().length > 0 : false,
               footVisible: foot ? (foot.getBoundingClientRect().bottom > 0 && foot.getBoundingClientRect().top < window.innerHeight && getComputedStyle(foot).display !== 'none') : false,
               maxScroll: document.documentElement.scrollHeight - document.documentElement.clientHeight };
    });
    ck(`wizard @${w}: page cannot scroll behind shell (preY=${preY}, now ${r.y}, maxScroll ${r.maxScroll})`, r.y === 0 && r.maxScroll === 0, 'mastTop=' + r.mastTop);
    ck(`wizard @${w}: header keeps the shared 10px top margin`, r.mastTop === 10 && r.gap === 0, 'mastTop=' + r.mastTop + ', gap=' + r.gap);
    ck(`wizard @${w}: footer never in the app surface`, !r.footShown && !r.footVisible);
    await ctx.close();
  }

  /* 2 — BUG A: instant jump past content must still reveal it */
  for (const [w, h] of [[1440, 900], [390, 844], [1024, 768], [320, 568]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h } });
    const p = await ctx.newPage();
    await p.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(350);
    await p.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
    await p.waitForTimeout(900);
    const hidden = await p.evaluate(() => [...document.querySelectorAll('.fade-io,.reveal')]
      .filter((el) => parseFloat(getComputedStyle(el).opacity) < 0.05)
      .map((el) => (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 16)));
    ck(`instant-jump @${w}: no permanently hidden content`, hidden.length === 0, hidden.join(', '));
    await ctx.close();
  }

  /* 3 — BUG C: wizard stage must not overflow horizontally at extreme width */
  for (const [w, z] of [[320, 200], [320, 175], [390, 200], [360, 200]]) {
    const vw = Math.round(w * 100 / z);
    const ctx = await b.newContext({ viewport: { width: vw, height: 700 } });
    const p = await ctx.newPage();
    await p.goto(BASE + '/swiftonios6guidepart1.html', { waitUntil: 'networkidle' });
    await p.click('.os-card:has-text("Monterey")');
    await p.waitForTimeout(600);
    const r = await p.evaluate(() => {
      const vp = document.querySelector('.wiz-viewport');
      const grid = document.querySelector('.os-grid').getBoundingClientRect();
      const cards = [...document.querySelectorAll('.os-card')].map((c) => Math.round(c.getBoundingClientRect().right));
      return { sw: vp.scrollWidth, cw: vp.clientWidth, gridR: Math.round(grid.right), vw: document.documentElement.clientWidth, maxCardR: Math.max(...cards) };
    });
    ck(`wizard @${w}z${z} (vw${vw}): step stage fits`, r.sw <= r.cw + 1 && r.maxCardR <= r.vw, JSON.stringify(r));
    await ctx.close();
  }

  /* 4 — skip link + colour scheme + tap targets */
  const c4 = await b.newContext({ viewport: { width: 1280, height: 800 } });
  const p4 = await c4.newPage();
  await p4.goto(BASE + '/index.html', { waitUntil: 'networkidle' });
  const cs = await p4.evaluate(() => getComputedStyle(document.documentElement).colorScheme);
  ck('color-scheme is dark', cs === 'dark', cs);
  await p4.keyboard.press('Tab');
  await p4.waitForTimeout(400);
  const skip = await p4.evaluate(() => {
    const el = document.querySelector('.skip-link');
    const r = el.getBoundingClientRect();
    return { focused: document.activeElement === el, text: el.textContent.trim(), top: Math.round(r.top), inView: r.top >= 0 && r.bottom <= window.innerHeight };
  });
  ck('skip link is the first Tab stop and becomes visible', skip.focused && skip.inView, JSON.stringify(skip));
  await p4.keyboard.press('Enter');
  await p4.waitForTimeout(500);
  const jumped = await p4.evaluate(() => ({ hash: location.hash, y: Math.round(window.scrollY) }));
  ck('skip link moves focus/scroll into the content', jumped.hash === '#main', JSON.stringify(jumped));
  await c4.close();

  const c5 = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const p5 = await c5.newPage();
  await p5.goto(BASE + '/index.html', { waitUntil: 'networkidle' });
  const taps = await p5.evaluate(() => {
    const h = (s) => [...document.querySelectorAll(s)].map((e) => Math.round(e.getBoundingClientRect().height));
    return { nav: h('.nav a'), foot: h('.foot-links a'), toc: h('.toc a') };
  });
  ck('nav links ≥44px tall', Math.min(...taps.nav) >= 44, taps.nav.join('/'));
  ck('footer links ≥36px tall', Math.min(...taps.foot) >= 36, taps.foot.join('/'));
  const mastH = await p5.evaluate(() => ({ v: getComputedStyle(document.documentElement).getPropertyValue('--mast-h').trim(), h: document.querySelector('.masthead').offsetHeight }));
  ck('masthead height unchanged by the tap-target padding', Math.abs(parseFloat(mastH.v) - mastH.h - 10) <= 0.5, JSON.stringify(mastH));
  await c5.close();

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  await b.close();
  process.exit(fail ? 1 : 0);
})();
