const { chromium } = require('playwright');
const BASE = 'http://127.0.0.1:8123';
let pass = 0, fail = 0;
const ck = (n, ok, d) => { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + n + (d ? '  [' + d + ']' : '')); };
(async () => {
  const b = await chromium.launch();
  for (const [w, h] of [[1920, 1080], [1440, 900], [390, 844]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h } });
    const p = await ctx.newPage();
    await p.goto(BASE + '/support.html', { waitUntil: 'networkidle' });
    await p.waitForTimeout(350);
    const r = await p.evaluate(() => {
      const f = document.querySelector('.site-foot').getBoundingClientRect();
      const m = document.querySelector('.masthead').getBoundingClientRect();
      return { footBottom: Math.round(f.bottom), vh: window.innerHeight, mastTop: Math.round(m.top), mastH: Math.round(m.height), maxScroll: document.documentElement.scrollHeight - document.documentElement.clientHeight };
    });
    ck(`support @${w}: footer sits at the page bottom (only the body margin below)`, r.footBottom >= r.vh - 90, JSON.stringify(r));
    ck(`support @${w}: masthead still rests 10px from the top`, r.mastTop === 10, 'top=' + r.mastTop);
    await ctx.close();
  }
  /* sticky behaviour must survive the flex column */
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(BASE + '/index.html', { waitUntil: 'networkidle' });
  await p.waitForTimeout(300);
  const rest = await p.evaluate(() => Math.round(document.querySelector('.masthead').getBoundingClientRect().top));
  await p.evaluate(() => window.scrollTo({ top: 800, behavior: 'instant' }));
  await p.waitForTimeout(400);
  const stuck = await p.evaluate(() => ({ top: Math.round(document.querySelector('.masthead').getBoundingClientRect().top), cls: document.querySelector('.masthead').classList.contains('is-stuck'), v: getComputedStyle(document.documentElement).getPropertyValue('--mast-h').trim() }));
  ck('masthead sticks to the top when scrolled', rest === 10 && stuck.top === 0 && stuck.cls, JSON.stringify({ rest, stuck }));
  await ctx.close();
  /* wizard page: still unscrollable, shell flush */
  const ctx2 = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p2 = await ctx2.newPage();
  await p2.goto(BASE + '/swiftonios6guidepart1.html', { waitUntil: 'networkidle' });
  await p2.click('.os-card:has-text("Monterey")');
  await p2.waitForTimeout(700);
  const wz = await p2.evaluate(() => {
    const m = document.querySelector('.masthead').getBoundingClientRect();
    const w = document.querySelector('#wizard').getBoundingClientRect();
    return { y: window.scrollY, max: document.documentElement.scrollHeight - document.documentElement.clientHeight, gap: Math.round((w.top - m.bottom) * 10) / 10, mastTop: Math.round(m.top), wizH: Math.round(w.height) };
  });
  ck('wizard: page unscrollable, shell flush under masthead', wz.y === 0 && wz.max === 0 && wz.gap === 0 && wz.mastTop === 0, JSON.stringify(wz));
  await ctx2.close();
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  await b.close();
  process.exit(fail ? 1 : 0);
})();
