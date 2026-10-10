const { chromium } = require('playwright');
const fs = require('fs');
const BASE = 'http://127.0.0.1:8123';
const OUT = 'shots/polish';
let pass = 0, fail = 0;
const ck = (n, ok, d) => { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + n + (d ? '  [' + d + ']' : '')); };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  await p.goto(BASE + '/photography.html', { waitUntil: 'networkidle' });
  await p.evaluate(() => (document.fonts ? document.fonts.ready : Promise.resolve())).catch(() => {});
  await p.waitForTimeout(2600);           /* let the real animation finish first */

  const cls = await p.evaluate(() => document.body.className);
  ck('body carries the page class', /page-photography/.test(cls), cls);

  /* hold every word at a given time so each frame is exact */
  const hold = (t) => p.evaluate((tt) => {
    document.querySelectorAll('.photo-title-word').forEach((el) => {
      el.getAnimations().forEach((a) => { a.pause(); a.currentTime = tt; });
    });
  }, t);
  const read = () => p.evaluate(() => [...document.querySelectorAll('.photo-title-word')].map((el) => {
    const cs = getComputedStyle(el);
    return { t: el.textContent, filter: cs.filter, opacity: cs.opacity, transform: cs.transform };
  }));
  const rect = () => p.evaluate(() => { const r = document.querySelector('.page-head h1').getBoundingClientRect(); return { l: Math.round(r.left), w: Math.round(r.width), h: Math.round(r.height), t: Math.round(r.top) }; });

  const clip = await p.evaluate(() => {
    const r = document.querySelector('.page-head h1').getBoundingClientRect();
    return { x: Math.max(0, Math.round(r.left) - 140), y: Math.max(0, Math.round(r.top) - 90), width: Math.round(r.width) + 280, height: Math.round(r.height) + 150 };
  });

  const frames = [0, 220, 430, 650, 900, 1600];
  for (const t of frames) {
    await hold(t);
    await p.waitForTimeout(90);
    await p.screenshot({ path: `${OUT}/focus_${String(t).padStart(4, '0')}.png`, clip });
  }
  const early = await (async () => { await hold(0); return read(); })();
  const late = await (async () => { await hold(1600); return read(); })();
  const rEarly = await (async () => { await hold(0); return rect(); })();
  const rLate = await (async () => { await hold(1600); return rect(); })();

  ck('starts defocused (wide blur, dim, scaled)', /blur\((1[0-9]|[0-9])/.test(early[0].filter) && parseFloat(early[0].opacity) < 0.45 && early[0].transform !== 'none', JSON.stringify(early[0]));
  const identity = (t) => t === 'none' || /matrix\(1, 0, 0, 1, 0, 0\)/.test(t);
  ck('ends sharp and opaque', /blur\(0px\)/.test(late[0].filter) && late[0].opacity === '1' && identity(late[0].transform), JSON.stringify(late[0]));
  /* at t=0 every word is still in its delay phase, so compare mid-rack instead */
  await hold(430);
  const mid = await read();
  const prog = (f) => { const m = f.match(/blur\(([\d.]+)px\)/); return m ? parseFloat(m[1]) : 0; };
  ck('words resolve in sequence (lens racks through them)', prog(mid[0].filter) < prog(mid[1].filter) && prog(mid[1].filter) < prog(mid[2].filter), mid.map((x) => prog(x.filter) + 'px').join(' > '));
  ck('no layout shift while focusing', rEarly.l === rLate.l && rEarly.w === rLate.w && rEarly.h === rLate.h && rEarly.t === rLate.t, JSON.stringify({ rEarly, rLate }));
  const ovf = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ck('no horizontal overflow from the blur bleed', ovf <= 0, 'doc+' + ovf);
  await ctx.close();

  /* reduced motion: sharp from the first frame */
  const c2 = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const p2 = await c2.newPage();
  await p2.goto(BASE + '/photography.html', { waitUntil: 'networkidle' });
  await p2.waitForTimeout(150);
  const rm = await p2.evaluate(() => {
    const el = document.querySelector('.photo-title-word');
    const cs = getComputedStyle(el);
    return { filter: cs.filter, opacity: cs.opacity, anims: el.getAnimations().length };
  });
  ck('reduced motion: title is sharp immediately', (rm.filter === 'none' || /blur\(0px\)/.test(rm.filter)) && rm.opacity === '1' && rm.anims === 0, JSON.stringify(rm));
  await c2.close();

  /* mobile overflow */
  const c3 = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p3 = await c3.newPage();
  await p3.goto(BASE + '/photography.html', { waitUntil: 'networkidle' });
  await p3.waitForTimeout(2200);
  const m = await p3.evaluate(() => ({ ovf: document.documentElement.scrollWidth - document.documentElement.clientWidth, filter: getComputedStyle(document.querySelector('.photo-title-word')).filter }));
  ck('mobile: no overflow, title sharp after the pull', m.ovf <= 0 && /blur\(0px\)/.test(m.filter), JSON.stringify(m));
  await c3.close();
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  await b.close();
  process.exit(fail ? 1 : 0);
})();
