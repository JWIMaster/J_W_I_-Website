/* J_W_I_ QA: the full-screen iOS 6 setup wizard.
   Verifies all three OS setups, the confirmation gating, both setup paths
   (templates + manual), the finale/restart, no-JS fallback, and reduced motion. */
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
async function progress(page) { return page.$eval('#wiz-progress', e => e.textContent); }
async function tickConfirm(page, expectGate) {
  /* gate check → tick → gate opens */
  const gated = await page.$eval('#wiz-next', b => b.disabled);
  if (expectGate !== undefined) check('next gated before confirm', gated);
  await page.click('.wizard-step:not(.is-hidden) .confirm-box');
  const opened = await page.$eval('#wiz-next', b => !b.disabled);
  if (expectGate !== undefined) check('next opens after confirm', opened);
  await page.click('#wiz-next');
}

async function newPage(browser, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...opts });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2600); /* let the lead typewriter settle */
  return { ctx, page, errs };
}

/* ── the shared setup phase, per OS ───────────────────────────── */
async function walkSetup(browser, os, versionCheck, rpathCheck) {
  const { ctx, page, errs } = await newPage(browser);

  check(os + ': step 0 visible', (await visibleSteps(page)).join('|') === 'Choose your macOS');
  check(os + ': next disabled before choice', await page.$eval('#wiz-next', b => b.disabled));

  await page.click(`.os-card:has(input[value="${os}"])`);
  check(os + ': card selected', await page.$eval(`.os-card:has(input[value="${os}"])`, c => c.classList.contains('is-selected')));
  check(os + ': next enabled after choice', await page.$eval('#wiz-next', b => !b.disabled));
  await page.click('#wiz-next');

  const h3 = os === 'mojave' ? 'Downloads — Mojave' : os === 'bigsur' ? 'Downloads — Big Sur' : 'Downloads — Monterey';
  check(os + ': downloads heading', (await page.$eval('.wizard-step:not(.is-hidden) h3', e => e.textContent.trim())) === h3);
  const xcodeFile = 'Xcode_' + versionCheck; /* evaluated in Node, not the page */
  check(os + ': xcode URL', await page.$eval('.wizard-step:not(.is-hidden) a', (a, f) => a.href.includes(f), xcodeFile));
  check(os + ': progress = Setup · 2 of 4', (await progress(page)) === 'Setup · 2 of 4', await progress(page));
  await tickConfirm(page, true);

  const xcodeOpts = await page.$$eval('.wizard-step:not(.is-hidden) .os-opt', els =>
    els.map(e => [e.textContent.replace(/\s+/g, ' ').trim(), getComputedStyle(e).display]));
  const visibleOpts = xcodeOpts.filter(o => o[1] !== 'none');
  check(os + ': install xcode + version', visibleOpts.length === 1 && visibleOpts[0][0].includes('Xcode ' + versionCheck),
    JSON.stringify(xcodeOpts));
  check(os + ': progress = Setup · 3 of 4', (await progress(page)) === 'Setup · 3 of 4', await progress(page));
  await tickConfirm(page, true);

  const rpath = await page.$$eval('.wizard-step:not(.is-hidden) .code-screen pre', els =>
    els.filter(e => e.offsetParent !== null).map(e => e.textContent));
  check(os + ': exactly one rpath block visible', rpath.length === 1, 'visible=' + rpath.length);
  const rpathCmd = (rpath[0] || '').trim();
  check(os + ': rpath command', rpathCmd.includes(rpathCheck), rpathCmd.slice(0, 80));

  /* copy button round-trip */
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://127.0.0.1:8123' });
  await page.$$eval('.wizard-step:not(.is-hidden) [data-copy-target]', els =>
    els.find(e => e.offsetParent !== null).click());
  await page.waitForTimeout(300);
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  check(os + ': copy → clipboard', clip === rpathCmd, 'clip=' + clip.slice(0, 60));

  check(os + ': progress = Setup · 4 of 4', (await progress(page)) === 'Setup · 4 of 4', await progress(page));
  await tickConfirm(page, true);

  /* path branch */
  check(os + ': path branch step', (await visibleSteps(page)).join('|') === 'How do you want to set up your project?');
  check(os + ': progress = Choose your path', (await progress(page)) === 'Choose your path', await progress(page));
  check(os + ': two path cards', (await page.$$('.path-card')).length === 2);
  check(os + ': next disabled before path choice', await page.$eval('#wiz-next', b => b.disabled));
  check(os + ': section title = Choose Your Path', (await page.$eval('#wiz-title', e => e.textContent)) === 'Choose Your Path');

  return { ctx, page, errs };
}

/* ── full walk: templates path (all three OSes) ───────────────── */
async function walkTemplates(browser, os, versionCheck, rpathCheck) {
  const { ctx, page, errs } = await walkSetup(browser, os, versionCheck, rpathCheck);

  await page.click('.path-card:has(input[value="templates"])');
  check(os + ': path card selected', await page.$eval('.path-card:has(input[value="templates"])', c => c.classList.contains('is-selected')));
  check(os + ': next enabled after path choice', await page.$eval('#wiz-next', b => !b.disabled));
  await page.click('#wiz-next');

  check(os + ': first template step', (await visibleSteps(page)).join('|') === 'Install Xcode Templates');
  check(os + ': progress = Templates · 1 of 7', (await progress(page)) === 'Templates · 1 of 7', await progress(page));
  const tmpl = await page.$eval('#templates', e => e.textContent);
  check('templates command intact', tmpl.includes('git clone https://github.com/JWIMaster/iOS-6-Swift-Xcode-Templates.git'));

  /* 7 template steps → 7 confirm+next ticks land on the finale */
  for (let i = 0; i < 7; i++) await tickConfirm(page, i === 0 ? undefined : true);

  const fin = (await visibleSteps(page)).join('|');
  check(os + ': templates finale reached', fin === 'Enjoy your IPA!', fin);
  check(os + ': progress = Setup complete', (await progress(page)) === 'Setup complete', await progress(page));
  check(os + ': section title = finale', (await page.$eval('#wiz-title', e => e.textContent)) === "You're All Set");
  check(os + ': next hidden at end', await page.$eval('#wiz-next', b => b.hidden));
  check(os + ': restart visible at end', await page.$eval('#wiz-restart', b => !b.hidden));
  check(os + ': back enabled at end', await page.$eval('#wiz-back', b => !b.disabled));

  /* back from the finale returns to the last step of the chosen path */
  await page.click('#wiz-back');
  check(os + ': back → last template step', (await visibleSteps(page)).join('|') === 'Choose the Build Folder');
  await page.click('#wiz-next'); /* its confirm is still ticked → back to the finale */
  check(os + ': back to finale', (await visibleSteps(page)).join('|') === 'Enjoy your IPA!');

  /* restart returns to step 0 with gates reset, OS kept */
  await page.click('#wiz-restart');
  check(os + ': restart → step 0', (await visibleSteps(page)).join('|') === 'Choose your macOS');
  const unchecked = await page.$$eval('.confirm-box', els => els.every(e => !e.checked));
  const pathCleared = await page.$$eval('input[name="wizard-path"]', els => els.every(e => !e.checked));
  const osKept = await page.$eval(`input[name="wizard-os"][value="${os}"]`, e => e.checked);
  check(os + ': restart clears confirms + path', unchecked && pathCleared);
  check(os + ': restart keeps the OS choice', osKept);

  await ctx.close();
  return errs;
}

/* ── full walk: manual path (one OS — the manual steps are OS-agnostic) ── */
async function walkManual(browser, os, versionCheck, rpathCheck) {
  const { ctx, page, errs } = await walkSetup(browser, os, versionCheck, rpathCheck);

  await page.click('.path-card:has(input[value="manual"])');
  check('manual: path card selected', await page.$eval('.path-card:has(input[value="manual"])', c => c.classList.contains('is-selected')));
  await page.click('#wiz-next');

  const first = (await visibleSteps(page)).join('|');
  check('manual: first manual step', first === 'Open the Project Settings', first);
  check('manual: shot beside the text', await page.$eval('.wizard-step:not(.is-hidden) .shot', e =>
    e.offsetParent !== null && getComputedStyle(e).gridColumnStart === '3'));
  check('manual: progress = Manual · 1 of 13', (await progress(page)) === 'Manual · 1 of 13', await progress(page));

  /* step 12 of the manual run is the code paste — verify the block rides along */
  for (let i = 0; i < 11; i++) await tickConfirm(page, i === 0 ? undefined : true);
  const paste = (await visibleSteps(page)).join('|');
  check('manual: paste step', paste === 'Paste the New Code', paste);
  check('manual: appdelegate block present', await page.$eval('#appdelegate', e => e.textContent.includes('AppDelegate')));

  await tickConfirm(page, true); /* → build */
  const build = (await visibleSteps(page)).join('|');
  check('manual: build step', build === 'Build Your App', build);
  check('manual: progress = Manual · 13 of 13', (await progress(page)) === 'Manual · 13 of 13', await progress(page));
  await tickConfirm(page, true);

  const fin = (await visibleSteps(page)).join('|');
  check('manual: finale reached', fin === 'Enjoy your IPA!', fin);

  await ctx.close();
  return errs;
}

(async () => {
  const browser = await chromium.launch();

  /* all three OSes, full templates path */
  const e1 = await walkTemplates(browser, 'mojave', '11.3.1', 'swift-5.1.5-RELEASE');
  const e2 = await walkTemplates(browser, 'bigsur', '13.2.1', 'swift-5.6.3-RELEASE');
  const e3 = await walkTemplates(browser, 'monterey', '13.4.1', 'swift-5.10.1-RELEASE');

  /* full manual path on one OS */
  const e4 = await walkManual(browser, 'bigsur', '13.2.1', 'swift-5.6.3-RELEASE');

  check('no console errors (4 walks)', e1.concat(e2, e3, e4).length === 0,
    e1.concat(e2, e3, e4).join('; ').slice(0, 200));

  /* no-JS: the whole guide must render stacked — 28 blocks */
  {
    const { ctx, page } = await newPage(browser, { javaScriptEnabled: false });
    await page.waitForTimeout(600);
    const n = await page.$$eval('.wizard-step', els => els.filter(e => !e.classList.contains('is-hidden')).length);
    check('no-JS: all 28 step blocks render', n === 28, 'count=' + n);
    await ctx.close();
  }

  /* reduced motion: steps swap instantly, no stuck opacity */
  {
    const { ctx, page } = await newPage(browser, { reducedMotion: 'reduce' });
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
