const { chromium } = require('playwright');
const probe = require('fs').readFileSync('.qa/strongprobe.js', 'utf8');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('file:///Users/jwalr/J_W_I_-Website/swiftios6.html', { waitUntil: 'networkidle' }).catch(()=>{});
  await p.setViewportSize({ width: 320, height: 680 });
  await p.waitForTimeout(800);
  await p.addScriptTag({ content: probe });
  console.log(await p.evaluate(() => window.__probeout || 'NO OUT'));
  await b.close();
})();
