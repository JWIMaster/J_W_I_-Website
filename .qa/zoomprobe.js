'use strict';
/* Probe: does Emulation.setPageScaleFactor change the layout viewport? */
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto('http://127.0.0.1:8123/index.html');
  const base = await page.evaluate(() => ({
    iw: innerWidth, ih: innerHeight,
    rem: parseFloat(getComputedStyle(document.documentElement).fontSize),
  }));
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 2 });
  await page.waitForTimeout(300);
  const z2 = await page.evaluate(() => ({
    iw: innerWidth, ih: innerHeight,
    rem: parseFloat(getComputedStyle(document.documentElement).fontSize),
  }));
  console.log(JSON.stringify({ base, z2 }));
  await browser.close();
})().catch((e) => { console.error('ERR', e); process.exit(1); });
