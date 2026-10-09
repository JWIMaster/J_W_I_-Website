const { chromium } = require('playwright');
const fs = require('fs');
const BASE = 'http://127.0.0.1:8123';
const OUT = 'shots/polish';
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();

  /* 1 — masthead: nav hover + keyboard focus ring */
  await p.goto(BASE + '/index.html', { waitUntil: 'networkidle' });
  await p.waitForTimeout(400);
  await p.hover('.nav a:nth-child(3)');
  await p.waitForTimeout(300);
  await p.screenshot({ path: `${OUT}/state_nav_hover.png`, clip: { x: 700, y: 0, width: 740, height: 80 } });
  await p.keyboard.press('Tab');
  await p.waitForTimeout(350);
  await p.screenshot({ path: `${OUT}/state_focus_skip.png`, clip: { x: 480, y: 0, width: 480, height: 70 } });

  /* 2 — index strip: cell hover */
  await p.mouse.move(0, 0);
  await p.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await p.waitForTimeout(300);
  await p.hover('.toc a:nth-child(2)');
  await p.waitForTimeout(300);
  const strip = await p.evaluate(() => { const r = document.querySelector('.toc-list').getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top) - 34, width: Math.round(r.width), height: Math.round(r.height) + 40 }; });
  await p.screenshot({ path: `${OUT}/state_toc_hover.png`, clip: strip });

  /* 3 — row button hover + focus */
  await p.evaluate(() => window.scrollTo({ top: 1050, behavior: 'instant' }));
  await p.waitForTimeout(300);
  await p.hover('.index-row .btn-primary');
  await p.waitForTimeout(300);
  await p.screenshot({ path: `${OUT}/state_btn_hover.png`, clip: { x: 900, y: 0, width: 540, height: 400 } });
  await p.close();

  /* 4 — article: copy button in its success state */
  const p2 = await ctx.newPage();
  await p2.goto(BASE + '/swiftios6.html', { waitUntil: 'networkidle' });
  await p2.waitForTimeout(400);
  await p2.evaluate(() => { const el = document.querySelector('.code-bar'); if (el) el.scrollIntoView({ block: 'center', behavior: 'instant' }); });
  await p2.waitForTimeout(400);
  const bar = await p2.evaluate(() => { const r = document.querySelector('.code-bar').getBoundingClientRect(); return { x: Math.round(r.left) - 4, y: Math.round(r.top) - 4, width: Math.round(r.width) + 8, height: Math.round(r.height) + 8 }; });
  await p2.screenshot({ path: `${OUT}/state_codebar_idle.png`, clip: bar });
  await p2.click('.code-bar .btn');
  await p2.waitForTimeout(350);
  await p2.screenshot({ path: `${OUT}/state_codebar_copied.png`, clip: bar });
  await p2.close();

  /* 5 — guide: disabled Next, then focused OS card, then armed Next */
  const p3 = await ctx.newPage();
  await p3.goto(BASE + '/swiftonios6guidepart1.html', { waitUntil: 'networkidle' });
  await p3.waitForTimeout(400);
  const ctl = await p3.evaluate(() => { const r = document.querySelector('.wiz-controls').getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top) - 6, width: Math.round(r.width), height: Math.round(r.height) + 12 }; });
  await p3.screenshot({ path: `${OUT}/state_wiz_disabled.png`, clip: ctl });
  await p3.evaluate(() => document.querySelector('.os-card input').focus());
  await p3.waitForTimeout(300);
  const cards = await p3.evaluate(() => { const r = document.querySelector('.os-grid').getBoundingClientRect(); return { x: Math.round(r.left) - 6, y: Math.round(r.top) - 6, width: Math.round(r.width) + 12, height: Math.round(r.height) + 12 }; });
  await p3.screenshot({ path: `${OUT}/state_wiz_cardfocus.png`, clip: cards });
  await p3.click('.os-card:has-text("Monterey")');
  await p3.waitForTimeout(500);
  await p3.click('#wiz-next');
  await p3.waitForTimeout(500);
  await p3.screenshot({ path: `${OUT}/state_wiz_armed.png`, clip: ctl });
  await p3.close();
  await b.close();
  console.log('states captured');
})();
