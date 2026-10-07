const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  for (const [name, w, h] of [['wiz_v375', 375, 812], ['wiz_v1024', 1024, 768]]) {
    const p = await b.newPage();
    await p.setViewportSize({ width: w, height: h });
    await p.goto('file:///Users/jwalr/J_W_I_-Website/swiftonios6guidepart1.html', { waitUntil: 'load' });
    await p.waitForTimeout(700);
    await p.screenshot({ path: `shots/zoom_${name}.png` });
    await p.close();
  }
  await b.close();
  console.log('done');
})();
