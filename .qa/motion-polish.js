const { chromium } = require('playwright');
const BASE = process.env.JWI_PREVIEW_BASE || 'http://127.0.0.1:8123/';
(async () => {
  const browser = await chromium.launch();
  try {
    for (const reducedMotion of ['no-preference', 'reduce']) {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion });
      for (const name of ['index.html', 'swiftios6.html', 'support.html', 'swiftonios6guidepart1.html']) {
        const page = await ctx.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(BASE + name, { waitUntil: 'domcontentloaded' });
        await page.evaluate(() => document.addEventListener('click', event => {
          if (event.target.closest('a')) event.preventDefault();
        }));
        if (name.includes('guide')) await page.locator('input[value="monterey"]').check();
        await page.locator('.btn:not([disabled]):visible').first().click();
        const buttonMotion = await page.locator('.btn.fun-tap').count();
        if ((reducedMotion === 'reduce' && buttonMotion) || (reducedMotion !== 'reduce' && !buttonMotion)) throw new Error(`${name}: incorrect motion preference`);
        await page.locator('.brand').hover();
        const dotAnimations = await page.locator('.brand .dot').evaluate(el => el.getAnimations().length);
        if (reducedMotion === 'reduce' && dotAnimations) throw new Error(`${name}: reduced-motion dot still animates`);
        if (errors.length) throw new Error(errors.join('\n'));
        await page.close();
      }
      await ctx.close();
    }
    console.log('PASS: button motion works on all four pages and respects reduced motion; no runtime errors');
  } finally { await browser.close(); }
})().catch(error => { console.error(error.message); process.exit(1); });
