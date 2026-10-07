const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  for (const w of [225, 213]) {
    await p.setViewportSize({ width: w, height: 350 });
    await p.goto('file:///Users/jwalr/J_W_I_-Website/index.html', { waitUntil: 'load' });
    await p.waitForTimeout(400);
    const r = await p.evaluate(() => {
      const btn = [...document.querySelectorAll('.index-links .btn')].find(x => x.innerText.includes('App Store'));
      const cs = getComputedStyle(btn);
      const range = document.createRange();
      range.selectNodeContents(btn);
      const before = range.getBoundingClientRect();
      btn.style.whiteSpace = 'nowrap';
      const after = range.getBoundingClientRect();
      btn.style.whiteSpace = '';
      return {
        vw: innerWidth,
        btnMaxW: cs.maxWidth, btnMinW: cs.minWidth, btnFlex: cs.flex, btnOvx: cs.overflowX,
        wrappedH: +before.height.toFixed(1), nowrapW: +after.width.toFixed(1), nowrapH: +after.height.toFixed(1),
        contentW: btn.clientWidth - (parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight)),
      };
    });
    console.log(JSON.stringify(r));
  }
  await b.close();
})();
