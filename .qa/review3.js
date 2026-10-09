const { chromium } = require('playwright');
const fs = require('fs');
const BASE = 'http://127.0.0.1:8123';
const OUT = 'shots/review3';
fs.mkdirSync(OUT, { recursive: true });
const JOBS = [
  { n: 'index_1440_hero', u: 'index.html', w: 1440, h: 900, y: 0 },
  { n: 'index_1440_rows', u: 'index.html', w: 1440, h: 900, y: 1050 },
  { n: 'index_1024_hero', u: 'index.html', w: 1024, h: 768, y: 0 },
  { n: 'index_390_hero', u: 'index.html', w: 390, h: 844, y: 0 },
  { n: 'index_390_rows', u: 'index.html', w: 390, h: 844, y: 1100 },
  { n: 'swift_1440_top', u: 'swiftios6.html', w: 1440, h: 900, y: 0 },
  { n: 'swift_1440_code', u: 'swiftios6.html', w: 1440, h: 900, y: 2600 },
  { n: 'support_1440', u: 'support.html', w: 1440, h: 900, y: 0 },
  { n: 'support_390', u: 'support.html', w: 390, h: 844, y: 0 },
  { n: 'wizard_1440', u: 'swiftonios6guidepart1.html', w: 1440, h: 900, wiz: true },
  { n: 'wizard_390', u: 'swiftonios6guidepart1.html', w: 390, h: 844, wiz: true },
  { n: 'wizard_step12_1440', u: 'swiftonios6guidepart1.html', w: 1440, h: 900, wiz: true, path: 'manual', to: 12 },
];
(async () => {
  const b = await chromium.launch();
  for (const j of JOBS) {
    const ctx = await b.newContext({ viewport: { width: j.w, height: j.h }, deviceScaleFactor: j.w < 500 ? 2 : 1 });
    const p = await ctx.newPage();
    await p.goto(BASE + '/' + j.u, { waitUntil: 'networkidle' });
    await p.evaluate(() => (document.fonts ? document.fonts.ready : Promise.resolve())).catch(() => {});
    await p.waitForTimeout(400);
    if (j.wiz) {
      await p.click('.os-card:has-text("Monterey")').catch(() => {});
      await p.waitForTimeout(500);
      if (j.path) {
        /* arm + advance through the setup phase to the path choice */
        for (let i = 0; i < 6; i++) { await p.click('#wiz-next').catch(() => {}); await p.waitForTimeout(220); }
        await p.click('.path-card:has-text("Manual")').catch(() => {});
        await p.waitForTimeout(300);
        for (let i = 0; i < 8; i++) { await p.click('#wiz-next').catch(() => {}); await p.waitForTimeout(220); }
      }
    }
    await p.evaluate(async () => { const de = document.documentElement; for (let y = 0; y <= de.scrollHeight; y += 450) { window.scrollTo({ top: y, behavior: 'instant' }); await new Promise((r) => setTimeout(r, 40)); } });
    await p.waitForTimeout(450);
    if (typeof j.y === 'number') { await p.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), j.y); await p.waitForTimeout(420); }
    await p.screenshot({ path: `${OUT}/${j.n}.png` });
    const st = await p.evaluate(() => ({ y: Math.round(window.scrollY), ticks: document.querySelectorAll('.wiz-ticks span').length, cur: document.querySelectorAll('.toc a.is-current').length, prog: !!document.querySelector('.read-progress.is-live') }));
    console.log(j.n, JSON.stringify(st));
    await ctx.close();
  }
  await b.close();
})();
