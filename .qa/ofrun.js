const { chromium } = require('playwright');
const probe = require('fs').readFileSync('.qa/overflowfinder.js', 'utf8');
const cases = [
  ['swiftios6.html', 183], ['swiftios6.html', 160], ['swiftios6.html', 195],
  ['index.html', 195], ['index.html', 160],
];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  for (const [page, w] of cases) {
    await p.goto('file:///Users/jwalr/J_W_I_-Website/' + page, { waitUntil: 'networkidle' }).catch(()=>{});
    await p.setViewportSize({ width: w, height: 680 });
    await p.waitForTimeout(600);
    const sw = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (sw <= 0) { console.log('== ' + page + ' vw=' + w + ' -> no overflow'); continue; }
    await p.addScriptTag({ content: probe });
    console.log('== ' + page + ' vw=' + w + ' overflow=' + sw);
    console.log(await p.evaluate(() => window.__probeout));
  }
  await b.close();
})();
