/* Post-fix retest matrix: every page × width × zoom (zoom emulated as
   viewport width round(W*100/z), clamped to >=160). Writes resp2/retest.json. */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROOT = '/Users/jwalr/J_W_I_-Website/';
const probe = fs.readFileSync(path.join(__dirname, 'retestprobe.js'), 'utf8');

const PAGES = ['index.html', 'swiftios6.html', 'swiftonios6guidepart1.html', 'support.html'];
const MOBILE = [320, 360, 375, 390, 414, 430, 450, 500, 600];
const DESKTOP = [700, 800, 900, 1024, 1280, 1440, 1920];
const ZOOMS_M = [100, 150, 175, 200];
const ZOOMS_D = [100, 150, 200];

function vwidth(W, z) {
  return Math.max(160, Math.round(W * 100 / z));
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const recs = [];
  for (const pg of PAGES) {
    const widths = MOBILE.concat(DESKTOP);
    for (const W of widths) {
      const zooms = W <= 640 ? ZOOMS_M : ZOOMS_D;
      for (const z of zooms) {
        const vw = vwidth(W, z);
        await page.setViewportSize({ width: vw, height: Math.max(200, Math.round(700 * 100 / z)) });
        await page.goto('file://' + ROOT + pg, { waitUntil: 'load' });
        await page.waitForTimeout(450); // let syncMast + wizard settle
        await page.addScriptTag({ content: probe });
        const o = await page.evaluate(() => window.__probeout);
        recs.push(Object.assign({ page: pg, W, z, vw }, o));
      }
    }
  }
  await browser.close();
  fs.writeFileSync(path.join(__dirname, 'retest.json'), JSON.stringify(recs, null, 1));
  console.log('records:', recs.length);

  // ---- flag failures ----
  const bad = recs.filter(r =>
    (r.ow || 0) > 0 ||
    (typeof r.wizGap === 'number' && r.wizGap !== 0) ||
    (r.btns || []).some(b => b.lines > 1) ||
    (r.hero && r.hero.r > r.iw + 0.5) ||
    (r.tokNS && r.tokNS.spill > 0) ||
    (r.tokPix && r.tokPix.spill > 0) ||
    (r.rowOw || 0) > 0
  );
  console.log('flagged:', bad.length);
  for (const r of bad) {
    console.log(JSON.stringify(r));
  }
  // sanity: show the worst non-flagged + a few key cells
  const key = recs.filter(r => (r.page === 'index.html' || r.page === 'swiftios6.html') && r.W === 320 && [150, 200].includes(r.z));
  for (const r of key) console.log('KEY', JSON.stringify(r));
})();
