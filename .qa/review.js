/* Visual review capture: full-page shots of every page at desktop + mobile,
   plus the guide with its wizard open. Output -> shots/review/. */
const { chromium } = require('playwright');
const fs = require('fs');

const BASE = 'http://127.0.0.1:8123';
const OUT = 'shots/review';
fs.mkdirSync(OUT, { recursive: true });

const JOBS = [
  { name: 'index', url: 'index.html', w: 1440, h: 900 },
  { name: 'index', url: 'index.html', w: 390, h: 844 },
  { name: 'index', url: 'index.html', w: 320, h: 568 },
  { name: 'swift', url: 'swiftios6.html', w: 1440, h: 900 },
  { name: 'swift', url: 'swiftios6.html', w: 390, h: 844 },
  { name: 'support', url: 'support.html', w: 1440, h: 900 },
  { name: 'support', url: 'support.html', w: 390, h: 844 },
  { name: 'guide', url: 'swiftonios6guidepart1.html', w: 1440, h: 900 },
  { name: 'guide', url: 'swiftonios6guidepart1.html', w: 390, h: 844 },
  { name: 'wizard', url: 'swiftonios6guidepart1.html', w: 1440, h: 900, open: true },
  { name: 'wizard', url: 'swiftonios6guidepart1.html', w: 390, h: 844, open: true },
];

(async () => {
  const browser = await chromium.launch();
  for (const j of JOBS) {
    const ctx = await browser.newContext({
      viewport: { width: j.w, height: j.h },
      deviceScaleFactor: 1,
    });
    const p = await ctx.newPage();
    await p.goto(BASE + '/' + j.url, { waitUntil: 'networkidle', timeout: 30000 });
    await p.evaluate(() => (document.fonts ? document.fonts.ready : Promise.resolve())).catch(() => {});
    await p.waitForTimeout(400);
    if (j.open) {
      await p.click('.os-card:has-text("Monterey")').catch(() => {});
      await p.waitForTimeout(900);
    }
    // lazy-load pass
    await p.evaluate(async () => {
      const de = document.documentElement;
      for (let y = 0; y <= de.scrollHeight; y += 700) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 80));
      }
      window.scrollTo(0, 0);
      for (const i of document.images) { if (!i.complete) i.loading = 'eager'; }
    });
    await p.waitForTimeout(1200);
    const f = `${OUT}/${j.name}_${j.w}${j.open ? '_wiz' : ''}.png`;
    await p.screenshot({ path: f, fullPage: !j.open });
    const dim = await p.evaluate(() => ({ h: document.documentElement.scrollHeight, over: document.documentElement.scrollWidth - document.documentElement.clientWidth }));
    console.log(f, 'pageH=' + dim.h, 'overflowX=' + dim.over);
    await ctx.close();
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
