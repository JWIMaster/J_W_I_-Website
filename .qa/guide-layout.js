const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const BASE = process.env.JWI_PREVIEW_BASE || 'http://127.0.0.1:8123/';
const OUT = path.join(__dirname, process.env.JWI_PREVIEW_HEIGHT ? 'guide-layout-' + process.env.JWI_PREVIEW_HEIGHT : 'guide-layout');
const PAGES = ['index.html', 'swiftios6.html', 'support.html', 'swiftonios6guidepart1.html'];
let checks = 0;
function check(ok, label) {
  checks++;
  if (!ok) throw new Error(label);
}
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  try {
    for (const width of (process.env.JWI_PREVIEW_WIDTHS || "320,390,768,1024,1440").split(",").map(Number)) {
      const ctx = await browser.newContext({ viewport: { width, height: Number(process.env.JWI_PREVIEW_HEIGHT) || (width < 500 ? 844 : 900) }, reducedMotion: 'reduce' });
      const page = await ctx.newPage();
      const headers = [];
      for (const name of PAGES) {
        await page.goto(BASE + name, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(250);
        const geometry = await page.evaluate(() => {
          const h = document.querySelector('.masthead').getBoundingClientRect();
          return { top: h.top, height: h.height, left: h.left, width: h.width, overflow: document.documentElement.scrollWidth > innerWidth + 1 };
        });
        check(!geometry.overflow, `${name} @${width}: page overflow`);
        headers.push(geometry);
      }
      check(headers.every(h => h.top === 10 && h.height === headers[0].height && h.left === headers[0].left && h.width === headers[0].width), `Headers differ @${width}`);
      for (const branch of ['templates', 'manual']) {
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.locator('input[value="monterey"]').check();
        let visited = 0;

        while (!(await page.locator('#wiz-restart').isVisible())) {
          const step = page.locator('.wizard-step:not(.is-hidden)');
          const number = await step.getAttribute('data-step');
          if (number === '4') await page.locator(`input[value="${branch}"]`).check();
          const image = step.locator('img');
          if (await image.count()) {
            await image.evaluate(img => { img.loading = 'eager'; return img.decode(); });
          }
          const result = await page.evaluate(() => {
            const stage = document.querySelector('.wiz-viewport');
            const step = document.querySelector('.wizard-step:not(.is-hidden)');
            const shot = step.querySelector(':scope > .shot');
            const img = shot && shot.querySelector('img');
            const ib = img && img.getBoundingClientRect();
            const sb = shot && shot.getBoundingClientRect();
            const controls = document.querySelector('.wiz-controls').getBoundingClientRect();
            const head = document.querySelector('.section-head').getBoundingClientRect();
            const vp = stage.getBoundingClientRect();
            return {
              xOverflow: stage.scrollWidth > stage.clientWidth + 1,
              scroll: stage.scrollTop,
              frameOK: vp.top >= head.bottom - 1 && vp.bottom <= controls.top + 1,
              imageOK: !img || !ib.width || (img.complete && img.naturalWidth > 0 && getComputedStyle(img).objectFit === 'contain' && ib.left >= sb.left && ib.right <= sb.right + 1),
              imageFrame: sb && sb.width > 0 && { width: sb.width, height: sb.height },
              naturalImage: !ib || !ib.width || (Math.abs(ib.width / ib.height - img.naturalWidth / img.naturalHeight) < 0.02 && Math.abs(sb.width - ib.width) < 1 && Math.abs(sb.height - ib.height) < 1 && getComputedStyle(shot).backgroundColor === 'rgba(0, 0, 0, 0)'),
              centered: stage.scrollHeight > stage.clientHeight + 1 || Math.abs((step.getBoundingClientRect().top + step.getBoundingClientRect().bottom) / 2 - (vp.top + vp.bottom) / 2) < 2,
              controlsOK: controls.bottom <= innerHeight,
            };
          });
          check(!result.xOverflow && result.naturalImage && result.centered && result.frameOK && result.imageOK && result.controlsOK && (result.scroll === 0 || number === '0' || number === '4'), `Step ${number}, ${branch} @${width}: ${JSON.stringify(result)}`);
          if (branch === 'manual' && ['0', '12', '14', '20', '23'].includes(number)) await page.screenshot({ path: path.join(OUT, `${width}-step-${number}.png`) });
          if (number === '23') {
            check(await step.locator('.code').evaluate(el => el.getBoundingClientRect().width >= el.parentElement.clientWidth - 1), 'Code does not use full reading width');
            check(await step.locator('details').evaluate(el => !el.open), 'Reference should start collapsed');
            await step.locator('summary').click();
            check(await step.locator('.reference-shot').isVisible(), 'Reference does not expand');
            await step.locator('.reference-shot').click();
            check(await page.locator('.lightbox').isVisible(), 'Reference does not open full-size');
            await page.keyboard.press('Escape');
            await step.locator('summary').click();
          }
          if (number === '14') {
            await step.locator('.shot').focus();
            await page.keyboard.press('Enter');
            check(await page.locator('.lightbox').isVisible(), 'Keyboard image preview failed');
            await page.keyboard.press('Tab');
            check(await page.locator('.lightbox-close').evaluate(el => el === document.activeElement), 'Preview focus escaped');
            await page.keyboard.press('Escape');
            check(await step.locator('.shot').evaluate(el => el === document.activeElement), 'Preview did not restore focus');
          }
          await page.locator('.wiz-viewport').evaluate(el => { el.scrollTop = el.scrollHeight; });
          if (await page.locator('#wiz-next .btn-ic').isVisible() && await step.locator('.confirm-box').count()) await page.locator('#wiz-next').click();
          await page.locator('#wiz-next').click();
          visited++;
          check(visited < 28, 'Wizard did not finish');
        }
        check(visited === (branch === 'manual' ? 18 : 12), `Missing ${branch} steps: ${visited}`);
      }
      await ctx.close();
    }
    console.log(`PASS: ${checks} layout, navigation, image and keyboard checks`);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error.message); process.exit(1); });
