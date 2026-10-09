const { chromium } = require('playwright');
const { pathToFileURL } = require('url');
const path = require('path');
const BASE = pathToFileURL(path.resolve(__dirname, '..') + path.sep).href;
(async () => {
  const browser = await chromium.launch();
  try {
    for (const reducedMotion of ['no-preference', 'reduce']) {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion });
      await page.goto(BASE + 'swiftonios6guidepart1.html');
      const gap = await page.evaluate(() => {
        const step = document.querySelector('[data-step="0"]');
        return step.querySelector('.os-grid').getBoundingClientRect().top - step.querySelector('p').getBoundingClientRect().bottom;
      });
      if (gap < 20) throw new Error('OS choices too close to description: ' + gap);
      await page.locator('input[value="monterey"]').check();
      const choiceMotion = await page.locator('input[value="monterey"]').evaluate(el => getComputedStyle(el).animationName);
      if ((choiceMotion === 'guide-choice-pop') !== (reducedMotion === 'no-preference')) throw new Error('Wrong selection animation');
      await page.locator('#wiz-next').click();
      await page.waitForTimeout(210);
      const step = page.locator('.wizard-step:not(.is-hidden)');
      if (await step.getAttribute('data-step') !== '1') throw new Error('Did not advance');
      const animations = await step.evaluate(el => ({
        badge: getComputedStyle(el.querySelector('.step-badge')).animationName,
        item: getComputedStyle(el.querySelector('.dl-list > li')).animationName,
        delay: getComputedStyle(el.querySelector('.dl-list > li:nth-child(3)')).animationDelay,
      }));
      if (reducedMotion === 'no-preference' && (animations.badge !== 'guide-badge-pop' || animations.item !== 'guide-item-arrive' || animations.delay !== '0.1s')) throw new Error('Missing staggered step animation');
      if (reducedMotion === 'reduce' && (animations.badge !== 'none' || animations.item !== 'none')) throw new Error('Reduced motion not respected');
      await page.locator('#wiz-next').click();
      const confirmation = await page.locator('#wiz-next .btn-ic').evaluate(el => getComputedStyle(el).animationName);
      if ((confirmation === 'guide-choice-pop') !== (reducedMotion === 'no-preference')) throw new Error('Wrong confirmation animation');
      await page.close();
    }
    console.log('PASS: picker spacing, staggered steps, selection and confirmation animations, and reduced motion');
  } finally { await browser.close(); }
})().catch(e => { console.error(e.message); process.exitCode = 1; });
