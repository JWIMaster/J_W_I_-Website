const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.setViewportSize({ width: 160, height: 350 });
  await p.goto('file:///Users/jwalr/J_W_I_-Website/index.html', { waitUntil: 'load' });
  await p.waitForTimeout(500);
  await p.evaluate(() => {
    const btn = [...document.querySelectorAll('.index-links .btn')].find(x => x.innerText.includes('App Store'));
    btn.scrollIntoView({ block: 'center' });
  });
  await p.waitForTimeout(400);
  await p.screenshot({ path: 'shots/zoom_cta_vw160.png' });
  await b.close();
  console.log('done');
})();
