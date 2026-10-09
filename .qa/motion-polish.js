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
        const arrow = page.locator('.action-arrow:visible').first();
        if (await arrow.count()) {
          await arrow.locator('..').hover();
          const moving = await arrow.evaluate(el => el.getAnimations().some(a => ['arrow-hop', 'mail-send'].includes(a.animationName)));
          if (moving !== (reducedMotion === 'no-preference')) throw new Error(`${name}: incorrect arrow hover motion`);
        }
        if (name === 'index.html') {
          await page.locator('.toc a').first().hover();
          const hopping = await page.locator('.toc .n').first().evaluate(el => el.getAnimations().some(a => a.animationName === 'number-hop'));
          if (hopping !== (reducedMotion === 'no-preference')) throw new Error('Incorrect section hover motion');
          const title = page.locator('.index-title').first();
          await title.hover();
          await page.waitForTimeout(400);
          const nudged = await title.evaluate(el => getComputedStyle(el).transform !== 'none');
          if (nudged !== (reducedMotion === 'no-preference')) throw new Error('Incorrect project title hover motion');
        }
        if (errors.length) throw new Error(errors.join('\n'));
        await page.close();
      }
      await ctx.close();
    }
    console.log('PASS: button and arrow feedback across pages, section and project hover effects, reduced motion and no runtime errors');
  } finally { await browser.close(); }
})().catch(error => { console.error(error.message); process.exit(1); });
