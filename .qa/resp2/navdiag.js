const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.setViewportSize({ width: 160, height: 350 });
  await p.goto('file:///Users/jwalr/J_W_I_-Website/index.html', { waitUntil: 'load' });
  await p.waitForTimeout(500);
  const r = await p.evaluate(() => {
    const out = {};
    const nav = document.querySelector('.nav');
    const cs = getComputedStyle(nav);
    out.nav = { owx: cs.overflowX, owy: cs.overflowY, w: nav.clientWidth, sw: nav.scrollWidth, rect: nav.getBoundingClientRect().toJSON() };
    const mast = document.querySelector('.masthead');
    out.mast = { owx: getComputedStyle(mast).overflowX, rect: mast.getBoundingClientRect().toJSON() };
    out.root = { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth };
    // walk up from the Photography span
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      if (n.data.trim() === 'Photography') {
        let el = n.parentElement, chain = [];
        while (el && el !== document.body) {
          const c = getComputedStyle(el);
          chain.push({ tag: el.tagName, cls: (el.className + '').slice(0, 40), owx: c.overflowX, w: el.clientWidth, sw: el.scrollWidth });
          el = el.parentElement;
        }
        out.chain = chain;
        break;
      }
    }
    // kill the nav and re-measure root
    nav.style.display = 'none';
    out.rootNoNav = { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth };
    nav.style.display = '';
    // also: which element (border box) has max right edge?
    let maxR = 0, who = null;
    for (const el of document.body.querySelectorAll('*')) {
      const rc = el.getBoundingClientRect();
      if (rc.right > maxR && rc.width > 0 && rc.width < innerWidth * 2) { maxR = rc.right; who = el.tagName + '.' + (el.className + '').toString().slice(0, 30); }
    }
    out.maxR = { right: +maxR.toFixed(1), who };
    return out;
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
