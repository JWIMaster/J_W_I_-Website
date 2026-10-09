/* J_W_I_ QA: the full-screen iOS 6 setup wizard.
   Verifies all three OS setups, the two-state Next button (first click arms
   the confirmation, second advances), the full-screen app frame, both setup
   paths (templates + manual), the finale/restart, no-JS fallback, and
   reduced motion. */
const { chromium } = require('playwright');

const URL = (process.env.JWI_PREVIEW_BASE || 'http://127.0.0.1:8123/') + 'swiftonios6guidepart1.html';
let pass = 0, fail = 0;
function check(name, ok, extra) {
  if (ok) { pass++; console.log('PASS  ' + name); }
  else { fail++; console.log('FAIL  ' + name + (extra ? '  — ' + extra : '')); }
}

/* The step swap animates: 180ms exit fade, then the enter transition. Every
   navigation must settle for longer than the exit delay before we read the
   board. (Reduced-motion swaps are instant — the wait is just insurance.) */
const SWAP = 220;
async function next(page) { await page.click('#wiz-next'); await page.waitForTimeout(SWAP); }
async function backNav(page) { await page.click('#wiz-back'); await page.waitForTimeout(SWAP); }

async function visibleSteps(page) {
  return page.$$eval('.wizard-step:not(.is-hidden)', els =>
    els.map(e => (e.querySelector('h3') || e.querySelector('p') || { textContent: '?' }).textContent.trim()));
}
async function progress(page) { return page.$eval('#wiz-progress', e => e.textContent); }

/* Two-state Next on a confirmation step: the button starts enabled and
 * un-armed; the first click ticks the confirmation (armed → green, label
 * "Next step"), the second click advances to the next step. */
async function tickConfirm(page, expectGate) {
  if (expectGate !== undefined) {
    const gated = await page.$eval('#wiz-next', b => b.disabled);
    check('confirm step: next enabled from the start', !gated);
    const armed0 = await page.$eval('#wiz-next', b => b.classList.contains('is-armed'));
    check('confirm step: not armed before first click', !armed0);
  }
  await page.click('#wiz-next');
  if (expectGate !== undefined) {
    const armed = await page.$eval('#wiz-next', b => b.classList.contains('is-armed'));
    check('confirm: green + armed after first click', armed);
    const label = await page.$eval('#wiz-next-label', e => e.textContent);
    check('confirm: label = Next step once armed', label === 'Next step', label);
  }
  await next(page);
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

  check(os + ': app frame active (body.wiz-app)', await page.$eval('body', b => b.classList.contains('wiz-app')));
  /* The requirement is that the wizard page cannot scroll — not that it uses a
     particular keyword. `overflow: hidden` still creates a scroll container
     that JS and scroll restoration can drive (that let the footer slide up
     behind the shell), so the app frame uses `clip`. Assert the behaviour: a
     non-scrolling overflow value *and* a programmatic jump that does not move. */
  check(os + ': page does not scroll', await page.$eval('body', () => {
    const blocked = (v) => v === 'hidden' || v === 'clip';
    const body = getComputedStyle(document.body).overflow;
    const html = getComputedStyle(document.documentElement).overflow;
    if (!blocked(body) && !blocked(html)) return false;
    const before = window.scrollY;
    window.scrollTo({ top: 99999, left: 0, behavior: 'instant' });
    const moved = window.scrollY !== before;
    window.scrollTo({ top: before, left: 0, behavior: 'instant' });
    return !moved;
  }));
  const visConfirms = await page.$$eval('.wiz-confirm', els => els.filter(e => getComputedStyle(e).display !== 'none').length);
  check(os + ': standalone confirm rows hidden in app mode', visConfirms === 0, 'visible=' + visConfirms);

  check(os + ': step 0 visible', (await visibleSteps(page)).join('|') === 'Choose your macOS');
  check(os + ': next disabled before choice', await page.$eval('#wiz-next', b => b.disabled));

  await page.click(`.os-card:has(input[value="${os}"])`);
  check(os + ': card selected', await page.$eval(`.os-card:has(input[value="${os}"])`, c => c.classList.contains('is-selected')));
  check(os + ': next enabled after choice', await page.$eval('#wiz-next', b => !b.disabled));
  await next(page);

  const h3 = os === 'mojave' ? 'Downloads — Mojave' : os === 'bigsur' ? 'Downloads — Big Sur' : 'Downloads — Monterey';
  check(os + ': downloads heading', (await page.$eval('.wizard-step:not(.is-hidden) h3', e => e.textContent.trim())) === h3);
  const xcodeFile = 'Xcode_' + versionCheck; /* evaluated in Node, not the page */
  check(os + ': xcode URL', await page.$eval('.wizard-step:not(.is-hidden) a', (a, f) => a.href.includes(f), xcodeFile));
  const tiles = await page.$$eval('.wizard-step:not(.is-hidden) .dl-ic', els => els.filter(e => e.offsetParent !== null).length);
  check(os + ': download rows carry tiles', tiles > 0, 'tiles=' + tiles);
  /* the whole row is the link — the anchor fills the card, so a click anywhere goes */
  const rowCover = await page.$$eval('.wizard-step:not(.is-hidden) .dl-list li', lis =>
    lis.map(li => { const a = li.querySelector('a.dl-row'); return a ? a.getBoundingClientRect().width / li.getBoundingClientRect().width : -1; }));
  check(os + ': whole download row is a link', rowCover.every(r => r >= 0.95), rowCover.map(r => r.toFixed(2)).join(','));
  const dlOffset = await page.$eval('.wizard-step:not(.is-hidden)', step => {
    const dl = step.querySelector('.dl-list');
    const body = step.querySelector('.step-body');
    return dl ? Math.round(dl.getBoundingClientRect().left - body.getBoundingClientRect().left) : -1;
  });
  check(os + ': download list left-aligned with the text', dlOffset >= 0 && dlOffset <= 8, 'offset=' + dlOffset + 'px');
  /* centered frame with breathing room: the head sits mid-viewport, padding above + below */
  const frame = await page.evaluate(() => {
    const h = document.querySelector('#wizard .section-head').getBoundingClientRect();
    const cs = getComputedStyle(document.querySelector('#wizard'));
    return { headCx: h.left + h.width / 2, winCx: window.innerWidth / 2, padTop: parseFloat(cs.paddingTop), padBottom: parseFloat(cs.paddingBottom) };
  });
  check(os + ': guide frame centered in the viewport', Math.abs(frame.headCx - frame.winCx) <= 12, 'offset=' + Math.round(frame.headCx - frame.winCx) + 'px');
  check(os + ': frame padding top/bottom', frame.padTop >= 24 && frame.padBottom >= 24, 'top=' + frame.padTop + ' bottom=' + frame.padBottom);
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
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], URL.startsWith('file:') ? {} : { origin: new global.URL(URL).origin });
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
  await next(page);

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
  await backNav(page);
  check(os + ': back → last template step', (await visibleSteps(page)).join('|') === 'Choose the Build Folder');
  check(os + ': its next is already armed', await page.$eval('#wiz-next', b => b.classList.contains('is-armed')));
  await next(page); /* its confirm is still ticked → back to the finale */
  check(os + ': back to finale', (await visibleSteps(page)).join('|') === 'Enjoy your IPA!');

  /* restart returns to step 0 with gates reset, OS kept */
  await page.click('#wiz-restart');
  await page.waitForTimeout(SWAP);
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
  await next(page);

  const first = (await visibleSteps(page)).join('|');
  check('manual: first manual step', first === 'Open the Project Settings', first);
  check('manual: screenshot follows the instructions in the reading column', await page.$eval('.wizard-step:not(.is-hidden)', step => {
    const body = step.querySelector('.step-body').getBoundingClientRect();
    const shot = step.querySelector('.shot').getBoundingClientRect();
    return shot.top >= body.bottom && Math.abs(shot.left - body.left) < 1;
  }));
  /* the entrance must actually animate — sampled mid-fade right after the
   * swap settles, then confirmed to reach full opacity */
  const midOp = await page.$eval('.wizard-step:not(.is-hidden)', e => getComputedStyle(e).opacity);
  check('manual: step enters with a fade (transition runs)', parseFloat(midOp) < 0.9, 'opacity=' + midOp);
  await page.waitForTimeout(400);
  check('manual: entrance settles fully opaque', await page.$eval('.wizard-step:not(.is-hidden)', e => getComputedStyle(e).opacity) === '1');
  /* the screenshot opens a full-screen preview; Esc closes it */
  await page.click('.wizard-step:not(.is-hidden) .shot img');
  await page.waitForTimeout(250);
  check('manual: lightbox opens on shot click', await page.$eval('.lightbox', e => !e.hidden && e.classList.contains('is-open')));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  check('manual: lightbox closes on Esc', await page.$eval('.lightbox', e => e.hidden));
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

  /* reload: the pre-paint claim must leave exactly one visible step, and the
   * claim must be released once guide1.js owns the board — no stack flash */
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    const vis = await page.$$eval('.wizard-step', els =>
      els.filter(e => getComputedStyle(e).display !== 'none').length);
    check('reload: exactly one step visible at load', vis === 1, 'visible=' + vis);
    check('reload: pre-paint claim released', await page.$eval('html', h => !h.classList.contains('wiz-app')));
    check('reload: app frame lives on body', await page.$eval('body', b => b.classList.contains('wiz-app')));
    await ctx.close();
  }

  /* no-JS: the whole guide must render stacked — 28 blocks, and the
     standalone confirm rows (the no-JS fallback for the two-state button) */
  {
    const { ctx, page } = await newPage(browser, { javaScriptEnabled: false });
    await page.waitForTimeout(600);
    const n = await page.$$eval('.wizard-step', els => els.filter(e => !e.classList.contains('is-hidden')).length);
    check('no-JS: all 28 step blocks render', n === 28, 'count=' + n);
    const conf = await page.$$eval('.wiz-confirm', els => els.filter(e => getComputedStyle(e).display !== 'none').length);
    check('no-JS: standalone confirm rows visible', conf > 0, 'visible=' + conf);
    await ctx.close();
  }

  /* reduced motion: steps swap instantly, no stuck opacity */
  {
    const { ctx, page } = await newPage(browser, { reducedMotion: 'reduce' });
    await page.click('.os-card:has(input[value="monterey"])');
    await next(page);
    const op = await page.$eval('.wizard-step:not(.is-hidden)', e => getComputedStyle(e).opacity);
    check('reduced motion: step fully opaque', op === '1', 'opacity=' + op);
    await ctx.close();
  }

  await browser.close();
  console.log('\n' + pass + ' passed, ' + fail + ' failed' + (fail ? '  *** WIZARD SUITE NOT CLEAN ***' : '  — ALL WIZARD CHECKS PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
