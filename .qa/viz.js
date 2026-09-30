/* Targeted wizard screenshots for manual review: downloads, branch, green
   armed confirm, manual step with screenshot, finale — at 1280 / 375 / 320. */
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
/* The two-state Next: one click ticks the confirmation (button goes green). */
const tick = async (p) => {
  await p.click('#wiz-next');
  await p.waitForTimeout(200);
};
/* Second click advances; 220 ms covers the 180 ms exit fade. */
const next = async (p) => {
  await p.click('#wiz-next');
  await p.waitForTimeout(220);
};
async function toPath(p) {
  await p.click('input[name="wizard-os"][value="monterey"]');
  await next(p);
  for (let i = 0; i < 3; i++) { await tick(p); await next(p); }
}
const pickPath = (p, v) => p.click(`input[name="wizard-path"][value="${v}"]`);

(async () => {
  const b = await chromium.launch();

  /* downloads step — the new row cards, desktop + mobile */
  await shoot(b, 'wiz_downloads_1280.png', 1280, async (p) => {
    await p.click('input[name="wizard-os"][value="monterey"]');
    await next(p);
  });
  await shoot(b, 'wiz_downloads_375.png', 375, async (p) => {
    await p.click('input[name="wizard-os"][value="monterey"]');
    await next(p);
  });

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

  /* templates step with the green armed Next (tick, not yet advanced) */
  await shoot(b, 'wiz_tmpl_confirm_1280.png', 1280, async (p) => {
    await toPath(p);
    await pickPath(p, 'templates');
    await next(p);
    await tick(p);
  });

  /* manual step with the screenshot below the text (desktop) */
  await shoot(b, 'wiz_manual_1280.png', 1280, async (p) => {
    await toPath(p);
    await pickPath(p, 'manual');
    await next(p);
  });

  /* manual step with the screenshot below the text (mobile) */
  await shoot(b, 'wiz_manual_375.png', 375, async (p) => {
    await toPath(p);
    await pickPath(p, 'manual');
    await next(p);
  });
  await shoot(b, 'wiz_manual_320.png', 320, async (p) => {
    await toPath(p);
    await pickPath(p, 'manual');
    await next(p);
  });

  /* the screenshot's full-screen preview, opened by clicking the shot */
  await shoot(b, 'wiz_lightbox_1280.png', 1280, async (p) => {
    await toPath(p);
    await pickPath(p, 'manual');
    await next(p);
    await p.click('.wizard-step:not(.is-hidden) .shot img');
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
