const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  for (const [name, vw, hh] of [['cta_vw213', 213, 467], ['cta_vw160', 160, 350]]) {
    const p = await b.newPage();
    await p.setViewportSize({ width: vw, height: hh });
    await p.goto('file:///Users/jwalr/J_W_I_-Website/index.html', { waitUntil: 'load' });
    await p.waitForTimeout(500);
    await p.evaluate(() => document.querySelector('#snap').scrollIntoView({ block: 'start' }));
    await p.waitForTimeout(400);
    await p.screenshot({ path: `shots/zoom_${name}.png` });
    await p.close();
  }
  await b.close();
  console.log('done');
})();
