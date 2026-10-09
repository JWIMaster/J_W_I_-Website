const { chromium } = require('playwright');
const fs = require('fs');
const BASE = 'http://127.0.0.1:8123';
const OUT = 'shots/polish';
fs.mkdirSync(OUT, { recursive: true });
const PAGES = [['index', 'index.html'], ['swift', 'swiftios6.html'], ['guide', 'swiftonios6guidepart1.html'], ['support', 'support.html']];
const VIEWS = [[1440, 900, 'd1440'], [768, 1024, 't768'], [390, 844, 'n390']];
(async () => {
  const b = await chromium.launch();
  for (const [vw, vh, tag] of VIEWS) {
    for (const [name, url] of PAGES) {
      const ctx = await b.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: 1 });
      const p = await ctx.newPage();
      await p.goto(BASE + '/' + url, { waitUntil: 'networkidle' });
      await p.evaluate(() => (document.fonts ? document.fonts.ready : Promise.resolve())).catch(() => {});
      await p.waitForTimeout(350);
      await p.evaluate(async () => { const de = document.documentElement; for (let y = 0; y <= de.scrollHeight; y += 600) { window.scrollTo({ top: y, behavior: 'instant' }); await new Promise((r) => setTimeout(r, 30)); } window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); });
      await p.waitForTimeout(600);
      await p.screenshot({ path: `${OUT}/${tag}_${name}_top.png` });
      /* mid-page slice to catch list/row rhythm */
      await p.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), Math.round((await p.evaluate(() => document.documentElement.scrollHeight)) * 0.45));
      await p.waitForTimeout(320);
      await p.screenshot({ path: `${OUT}/${tag}_${name}_mid.png` });
      /* wizard: capture the open state too */
      if (name === 'guide') {
        await p.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }));
        await p.click('.os-card:has-text("Monterey")').catch(() => {});
        await p.waitForTimeout(700);
        await p.screenshot({ path: `${OUT}/${tag}_${name}_wiz.png` });
      }
      await ctx.close();
    }
  }
  await b.close();
  console.log('captured');
})();
