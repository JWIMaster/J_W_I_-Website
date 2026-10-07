const { chromium } = require('playwright');
const probe = require('fs').readFileSync('.qa/swprobe.js', 'utf8');
const cases = [
  ['swiftios6.html', 183, 680], ['swiftios6.html', 160, 680], ['swiftios6.html', 195, 680],
  ['index.html', 195, 680], ['index.html', 160, 680],
];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  for (const [page, w, h] of cases) {
    await p.goto('file:///Users/jwalr/J_W_I_-Website/' + page, { waitUntil: 'networkidle' }).catch(()=>{});
    await p.setViewportSize({ width: w, height: h });
    await p.waitForTimeout(600);
    await p.addScriptTag({ content: probe });
    console.log('== ' + page + ' vw=' + w);
    console.log(await p.evaluate(() => window.__probeout));
  }
  await b.close();
})();
