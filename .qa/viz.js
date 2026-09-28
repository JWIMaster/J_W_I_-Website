/* Targeted wizard screenshots for manual review: branch, checked confirm,
   manual step with screenshot, finale — at 1280 / 375 / 320. */
const { chromium } = require('playwright');
const URL = 'http://127.0.0.1:8123/swiftonios6guidepart1.html';

async function shoot(browser, name, width, fn) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 500 ? 720 : 800 }, deviceScaleFactor: width < 500 ? 2 : 1 });
  const p = await ctx.newPage();
  await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2600);
  await fn(p);
  await p.waitForTimeout(600);
  await p.screenshot({ path: 'shots/' + name });
  await ctx.close();
  console.log('shot ' + name);
}
/* dispatch via JS — a real mouse click races the 340 ms reveal on some steps */
const tick = async (p) => {
  await p.waitForSelector('.wizard-step:not(.is-hidden) .confirm-box', { state: 'attached' });
  await p.evaluate(() => {
    const box = document.querySelector('.wizard-step:not(.is-hidden) .confirm-box');
    if (box && !box.checked) box.click();
  });
  await p.waitForTimeout(120);
};
const next = async (p) => p.click('#wiz-next');
async function toPath(p) {
  await p.click('input[name="wizard-os"][value="monterey"]');
  await next(p);
  for (let i = 0; i < 3; i++) { await tick(p); await next(p); }
}
const pickPath = (p, v) => p.click(`input[name="wizard-path"][value="${v}"]`);

(async () => {
  const b = await chromium.launch();

  /* path branch step */
  await shoot(b, 'wiz_branch_1280.png', 1280, async (p) => {
    await toPath(p);
    await pickPath(p, 'templates');
  });
  await shoot(b, 'wiz_branch_375.png', 375, async (p) => {
    await toPath(p);
  });
  await shoot(b, 'wiz_branch_320.png', 320, async (p) => {
    await toPath(p);
  });

  /* templates step with a ticked confirm */
  await shoot(b, 'wiz_tmpl_confirm_1280.png', 1280, async (p) => {
    await toPath(p);
    await pickPath(p, 'templates');
    await next(p);
    await tick(p);
  });

  /* manual step with screenshot (desktop 3-col) */
  await shoot(b, 'wiz_manual_1280.png', 1280, async (p) => {
    await toPath(p);
    await pickPath(p, 'manual');
    await next(p);
  });

  /* manual step with screenshot (mobile stacked) */
  await shoot(b, 'wiz_manual_375.png', 375, async (p) => {
    await toPath(p);
    await pickPath(p, 'manual');
    await next(p);
  });

  /* finale */
  await shoot(b, 'wiz_finale_1280.png', 1280, async (p) => {
    await toPath(p);
    await pickPath(p, 'manual');
    await next(p);
    for (let i = 0; i < 13; i++) { await tick(p); await next(p); }
  });
  await shoot(b, 'wiz_finale_320.png', 320, async (p) => {
    await toPath(p);
    await pickPath(p, 'manual');
    await next(p);
    for (let i = 0; i < 13; i++) { await tick(p); await next(p); }
  });

  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
