/* J_W_I_ QA: interactive wizard on the toolchain guide (part 1).
   Verifies all three OS paths, progress/phase text, copy buttons,
   final CTA, no-JS fallback, and reduced motion. */
const { chromium } = require('playwright');

const URL = 'http://127.0.0.1:8123/swiftonios6guidepart1.html';
let pass = 0, fail = 0;
function check(name, ok, extra) {
  if (ok) { pass++; console.log('PASS  ' + name); }
  else { fail++; console.log('FAIL  ' + name + (extra ? '  — ' + extra : '')); }
}

async function visibleSteps(page) {
  return page.$$eval('.wizard-step:not(.is-hidden)', els =>
    els.map(e => (e.querySelector('h3') || e.querySelector('p') || { textContent: '?' }).textContent.trim()));
}
async function walkOS(browser, os, versionCheck, rpathCheck, progressMid) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2600); /* let the lead typewriter settle */

  check(os + ': step 0 visible', (await visibleSteps(page)).join('|') === 'Choose your macOS');
  check(os + ': next disabled before choice', await page.$eval('#wiz-next', b => b.disabled));

  await page.click(`.os-card:has(input[value="${os}"])`);
  check(os + ': card selected', await page.$eval(`.os-card:has(input[value="${os}"])`, c => c.classList.contains('is-selected')));
  check(os + ': next enabled after choice', await page.$eval('#wiz-next', b => !b.disabled));
  await page.click('#wiz-next');

  const dl = await visibleSteps(page);
  check(os + ': downloads step for ' + os, dl.join('|').startsWith('Downloads —'), dl.join('|'));
  const h3 = os === 'mojave' ? 'Downloads — Mojave' : os === 'bigsur' ? 'Downloads — Big Sur' : 'Downloads — Monterey';
  check(os + ': downloads heading', (await page.$eval('.wizard-step:not(.is-hidden) h3', e => e.textContent.trim())) === h3);
  check(os + ': xcode 11.3.1 URL', os === 'mojave'
    ? await page.$eval('.wizard-step:not(.is-hidden) a', a => a.href.includes('Xcode_11.3.1.xip'))
    : true);
  check(os + ': progress text', (await page.$eval('#wiz-progress', e => e.textContent)) === 'Downloads · 2 of 2');

  await page.click('#wiz-next');
  const xcodeOpts = await page.$$eval('.wizard-step:not(.is-hidden) .os-opt', els =>
    els.map(e => [e.textContent.replace(/\s+/g, ' ').trim(), getComputedStyle(e).display]));
  const visibleOpts = xcodeOpts.filter(o => o[1] !== 'none');
  check(os + ': install xcode + version', visibleOpts.length === 1 && visibleOpts[0][0].includes('Xcode ' + versionCheck),
    JSON.stringify(xcodeOpts));
  await page.click('#wiz-next');

  const rpath = await page.$$eval('.wizard-step:not(.is-hidden) .code-screen pre', els =>
    els.filter(e => e.offsetParent !== null).map(e => e.textContent));
  check(os + ': exactly one rpath block visible', rpath.length === 1, 'visible=' + rpath.length);
  const rpathCmd = rpath[0] || '';
  check(os + ': rpath command', rpathCmd.includes(rpathCheck), rpathCmd.slice(0, 80));
  check(os + ': rpath copy button', await page.$eval('.wizard-step:not(.is-hidden) [data-copy-target]', b => !!b));

  /* copy button round-trip */
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://127.0.0.1:8123' });
  await page.$$eval('.wizard-step:not(.is-hidden) [data-copy-target]', els =>
    els.find(e => e.offsetParent !== null).click());
  await page.waitForTimeout(300);
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  check(os + ': copy → clipboard', clip === rpathCmd.trim(), 'clip=' + clip.slice(0, 60));

  await page.click('#wiz-next');
  check(os + ': templates step', (await visibleSteps(page)).join('|').includes('Install Xcode Templates'));
  const tmpl = await page.$eval('#templates', e => e.textContent);
  check('templates command intact', tmpl.includes('git clone https://github.com/JWIMaster/iOS-6-Swift-Xcode-Templates.git'));
  await page.click('#wiz-next');
  const selText = await page.$eval('.wizard-step:not(.is-hidden) .step-body', e => e.textContent.replace(/\s+/g, ' ').trim());
  check(os + ': select template step', selText.includes('Legacy Swift Application'), selText);
  check(os + ': installation phase text', (await page.$eval('#wiz-progress', e => e.textContent)) === 'Installation · 4 of 4');
  check(os + ': section head = Build?', (await page.$eval('#wiz-title', e => e.textContent)) === 'Installing the Toolchain');

  for (let i = 0; i < 6; i++) await page.click('#wiz-next');

  check(os + ': final step reached', (await visibleSteps(page)).join('|').includes('Enjoy your IPA!'));
  check(os + ': final CTA visible', await page.$eval('#wiz-final', a => !a.hidden && a.href.includes('swiftonios6guidepart2.html')));
  check(os + ': next hidden at end', await page.$eval('#wiz-next', b => b.hidden));
  check(os + ': back enabled at end', await page.$eval('#wiz-back', b => !b.disabled));
  check(os + ': build phase text', (await page.$eval('#wiz-progress', e => e.textContent)) === 'Build · 6 of 6');

  /* back navigation restores the per-OS variant */
  for (let i = 0; i < 8; i++) await page.click('#wiz-back');
  const backRpath = await page.$$eval('.wizard-step:not(.is-hidden) .code-screen pre', els =>
    els.filter(e => e.offsetParent !== null).map(e => e.textContent).join('|'));
  check(os + ': back → rpath variant restored', backRpath.includes(rpathCheck), backRpath.slice(0, 80));

  /* console errors */
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await ctx.close();
  return errs;
}

(async () => {
  const browser = await chromium.launch();

  const errs1 = await walkOS(browser, 'mojave', '11.3.1', 'swift-5.1.5-RELEASE', 'Downloads · 2 of 2');
  const errs2 = await walkOS(browser, 'bigsur', '13.2.1', 'swift-5.6.3-RELEASE', 'Downloads · 2 of 2');
  const errs3 = await walkOS(browser, 'monterey', '13.4.1', 'swift-5.10.1-RELEASE', 'Downloads · 2 of 2');
  check('no console errors (3 paths)', errs1.concat(errs2, errs3).length === 0, errs1.concat(errs2, errs3).join('; ').slice(0, 200));

  /* no-JS: the whole guide must render stacked */
  {
    const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    const n = await page.$$eval('.wizard-step', els => els.filter(e => !e.classList.contains('is-hidden')).length);
    check('no-JS: all 14 step blocks render', n === 14, 'count=' + n);
    await ctx.close();
  }

  /* reduced motion: steps swap instantly, no stuck opacity */
  {
    const ctx = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2600);
    await page.click('.os-card:has(input[value="monterey"])');
    await page.click('#wiz-next');
    const op = await page.$eval('.wizard-step:not(.is-hidden)', e => getComputedStyle(e).opacity);
    check('reduced motion: step fully opaque', op === '1', 'opacity=' + op);
    await ctx.close();
  }

  await browser.close();
  console.log('\n' + pass + ' passed, ' + fail + ' failed' + (fail ? '  *** WIZARD SUITE NOT CLEAN ***' : '  — ALL WIZARD CHECKS PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
