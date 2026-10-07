const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  for (const [name, vw] of [['index_vw160', 160], ['index_vw213', 213]]) {
    const p = await b.newPage();
    await p.setViewportSize({ width: vw, height: 350 });
    await p.goto('file:///Users/jwalr/J_W_I_-Website/index.html', { waitUntil: 'load' });
    await p.waitForTimeout(600);
    await p.evaluate(() => window.scrollTo(0, 0));
    await p.screenshot({ path: `shots/zoom_${name}.png` });
    await p.close();
  }
  await b.close();
  console.log('done');
})();
