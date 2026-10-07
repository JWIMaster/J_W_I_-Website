const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  for (const w of [225, 213]) {
    await p.setViewportSize({ width: w, height: 350 });
    await p.goto('file:///Users/jwalr/J_W_I_-Website/index.html', { waitUntil: 'load' });
    await p.waitForTimeout(400);
    const r = await p.evaluate(() => {
      const btns = [...document.querySelectorAll('.index-links .btn')];
      const btn = btns.find(x => x.innerText.includes('App Store'));
      const cs = getComputedStyle(btn);
      const br = btn.getBoundingClientRect();
      const spans = [...btn.querySelectorAll('span')].map(s => {
        const rc = s.getBoundingClientRect();
        return { t: s.textContent.slice(0, 30), w: +rc.width.toFixed(1), disp: getComputedStyle(s).display };
      });
      const range = document.createRange();
      range.selectNodeContents(btn);
      const rr = range.getBoundingClientRect();
      return {
        vw: innerWidth, btnW: +br.width.toFixed(1), pad: cs.padding, gap: cs.gap,
        disp: cs.display, flexDir: cs.flexDirection, contentW: btn.clientWidth - (parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight)),
        spans, labelRect: { w: +rr.width.toFixed(1), h: +rr.height.toFixed(1) },
        innerHTML: btn.innerHTML.replace(/\s+/g, ' ').slice(0, 160),
      };
    });
    console.log(JSON.stringify(r));
  }
  await b.close();
})();
