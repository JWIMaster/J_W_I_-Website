const { chromium } = require('playwright');
const { pathToFileURL } = require('url');
const path = require('path');
const BASE = process.env.JWI_PREVIEW_BASE || pathToFileURL(path.resolve(__dirname, '..') + path.sep).href;
(async () => {
 const browser = await chromium.launch();
 try {
  for (const reducedMotion of ['no-preference', 'reduce']) {
  for (const width of [390, 680, 1024]) {
   const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion });
   await page.route(/(?:site|guide1)\.js$/, async route => {
    await new Promise(resolve => setTimeout(resolve, 800));
    await route.continue();
   });
   await page.addInitScript(() => {
    window.entryFrames = [];
    function record() {
     if (location.pathname.endsWith('swiftonios6guidepart1.html')) {
      const steps = [...document.querySelectorAll('.wizard-step')].filter(el => getComputedStyle(el).display !== 'none');
      const head = document.querySelector('.masthead');
      const wizard = document.querySelector('#wizard');
      if (head && wizard && steps.length) window.entryFrames.push({ arrival: steps[0].getAnimations().some(a => a.animationName === 'guide-arrive'), count: steps.length, step: steps[0].dataset.step, top: wizard.getBoundingClientRect().top, headerBottom: head.getBoundingClientRect().bottom, fadedShell: wizard.classList.contains('tw-rest') });
     }
     if (window.entryFrames.length < 100) requestAnimationFrame(record);
    }
    requestAnimationFrame(record);
   });
   await page.goto(BASE + 'swiftios6.html');
   await page.evaluate(() => scrollTo(0, 500));
   await page.locator('.nav a[href="swiftonios6guidepart1.html"]').click();
   await page.waitForTimeout(1000);
   const frames = await page.evaluate(() => window.entryFrames);
   console.log(width, JSON.stringify({frames:frames.length, counts:[...new Set(frames.map(f=>f.count))], gaps:[...new Set(frames.map(f=>+(f.top-f.headerBottom).toFixed(2)))]}));
   if (!frames.length || frames.some(f => f.fadedShell || f.count !== 1 || f.step !== '0' || Math.abs(f.top-f.headerBottom)>1)) throw new Error('Unstable guide first paint at '+width);
   if (frames.some(f => f.arrival) !== (reducedMotion === 'no-preference')) throw new Error('Incorrect entrance animation preference at '+width);
   await page.close();
  }
  }
  console.log('PASS: entry remains stable while the guide script is delayed');
 } finally { await browser.close(); }
})().catch(e=>{console.error(e.message);process.exitCode=1});
