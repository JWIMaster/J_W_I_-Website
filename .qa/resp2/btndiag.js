const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const rows = [];
  for (const w of [213, 160, 183]) {
    await p.setViewportSize({ width: w, height: 350 });
    await p.goto('file:///Users/jwalr/J_W_I_-Website/index.html', { waitUntil: 'load' });
    await p.waitForTimeout(400);
    rows.push(await p.evaluate((vw) => {
      const row = document.querySelector('.index-row');
      const links = row.querySelector('.index-links');
      const btn = links.querySelector('.btn');
      const label = btn.querySelector('span') || btn;
      const cs = getComputedStyle(btn);
      const r = el => el.getBoundingClientRect();
      // label max-content: force the button to shrink-2 auto and measure
      const prev = btn.style.cssText;
      btn.style.width = 'max-content';
      const mc = btn.offsetWidth;
      btn.style.cssText = prev;
      return {
        vw,
        rowW: +r(row).width.toFixed(1), rowPad: cs === null ? null : getComputedStyle(row).paddingInline,
        linksW: +r(links).width.toFixed(1),
        btnBox: +r(btn).width.toFixed(1), btnPad: cs.paddingInline, btnW: cs.width,
        labelMaxContent: mc,
        rowCol: row.children[1] ? +r(row.children[1]).width.toFixed(1) : null,
      };
    }, w));
  }
  console.log(JSON.stringify(rows, null, 1));
  await b.close();
})();
