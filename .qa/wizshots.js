/* Quick visual shots of the wizard for manual review. */
const { chromium } = require('playwright');
const URL = 'http://127.0.0.1:8123/swiftonios6guidepart1.html';

(async () => {
  const browser = await chromium.launch();

  /* desktop: step 0 (OS cards), step 1 (downloads, big sur), step 3 (rpath, monterey) */
  const d = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  const p = await d.newPage();
  await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2600);
  await p.screenshot({ path: 'shots/v3_wiz_desktop_step0.png' });
  await p.click('.os-card:has(input[value="bigsur"])');
  await p.click('#wiz-next');
  await p.waitForTimeout(500);
  await p.screenshot({ path: 'shots/v3_wiz_desktop_downloads.png' });
  await p.click('#wiz-next');
  await p.click('#wiz-next');
  await p.waitForTimeout(500);
  await p.screenshot({ path: 'shots/v3_wiz_desktop_rpath.png' });
  for (let i = 0; i < 4; i++) await p.click('#wiz-next');
  await p.waitForTimeout(500);
  await p.screenshot({ path: 'shots/v3_wiz_desktop_final.png' });
  await d.close();

  /* mobile 375: step 0, downloads, rpath (wide code) */
  const m = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
  const mp = await m.newPage();
  await mp.goto(URL, { waitUntil: 'domcontentloaded' });
  await mp.waitForTimeout(2600);
  await mp.screenshot({ path: 'shots/v3_wiz_m375_step0.png' });
  await mp.click('.os-card:has(input[value="monterey"])');
  await mp.click('#wiz-next');
  await mp.waitForTimeout(500);
  await mp.screenshot({ path: 'shots/v3_wiz_m375_downloads.png' });
  await mp.click('#wiz-next');
  await mp.click('#wiz-next');
  await mp.waitForTimeout(500);
  await mp.screenshot({ path: 'shots/v3_wiz_m375_rpath.png' });
  await m.close();

  /* 320: step 0 card stack + controls row */
  const t = await browser.newContext({ viewport: { width: 320, height: 700 }, isMobile: true, hasTouch: true });
  const tp = await t.newPage();
  await tp.goto(URL, { waitUntil: 'domcontentloaded' });
  await tp.waitForTimeout(2600);
  await tp.screenshot({ path: 'shots/v3_wiz_m320_step0.png' });
  await t.close();

  await browser.close();
  console.log('wizard shots done');
})().catch(e => { console.error(e); process.exit(1); });
