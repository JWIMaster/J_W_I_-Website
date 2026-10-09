const { chromium } = require('playwright');
const fs = require('fs');
const BASE = 'http://127.0.0.1:8123';
const OUT = 'shots/review2';
fs.mkdirSync(OUT, { recursive: true });
const JOBS = [
  { n: 'index_1440_hero', u: 'index.html', w: 1440, h: 900, y: 0 },
  { n: 'index_1440_rows', u: 'index.html', w: 1440, h: 900, y: 900 },
  { n: 'index_1440_foot', u: 'index.html', w: 1440, h: 900, y: 99999 },
  { n: 'index_390_hero', u: 'index.html', w: 390, h: 844, y: 0 },
  { n: 'index_390_rows', u: 'index.html', w: 390, h: 844, y: 1200 },
  { n: 'index_160_zoom', u: 'index.html', w: 160, h: 700, y: 300 },
  { n: 'support_1440', u: 'support.html', w: 1440, h: 900, y: 0 },
  { n: 'support_390', u: 'support.html', w: 390, h: 844, y: 0 },
  { n: 'wizard_1440', u: 'swiftonios6guidepart1.html', w: 1440, h: 900, wiz: true },
  { n: 'wizard_390', u: 'swiftonios6guidepart1.html', w: 390, h: 844, wiz: true },
  { n: 'swift_1440_top', u: 'swiftios6.html', w: 1440, h: 900, y: 300 },
];
(async () => {
  const b = await chromium.launch();
  for (const j of JOBS) {
    const ctx = await b.newContext({ viewport: { width: j.w, height: j.h }, deviceScaleFactor: j.w < 500 ? 2 : 1 });
    const p = await ctx.newPage();
    await p.goto(BASE + '/' + j.u, { waitUntil: 'networkidle' });
    await p.evaluate(() => (document.fonts ? document.fonts.ready : Promise.resolve())).catch(() => {});
    await p.waitForTimeout(400);
    if (j.wiz) { await p.click('.os-card:has-text("Monterey")').catch(() => {}); await p.waitForTimeout(700); }
    await p.evaluate(async () => { const de = document.documentElement; for (let y = 0; y <= de.scrollHeight; y += 450) { window.scrollTo({ top: y, behavior: 'instant' }); await new Promise((r) => setTimeout(r, 45)); } });
    await p.waitForTimeout(500);
    if (typeof j.y === 'number') { await p.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), j.y); await p.waitForTimeout(450); }
    await p.screenshot({ path: `${OUT}/${j.n}.png` });
    console.log(j.n, 'y=' + (await p.evaluate(() => Math.round(window.scrollY))));
    await ctx.close();
  }
  await b.close();
})();
