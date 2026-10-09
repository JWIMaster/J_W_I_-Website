const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  for (const w of [1920, 1440, 1280, 1024, 768, 640, 390]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 800 } });
    const p = await ctx.newPage();
    await p.goto('http://127.0.0.1:8123/index.html', { waitUntil: 'networkidle' });
    await p.waitForTimeout(300);
    const r = await p.evaluate(() => {
      const L = (s) => { const el = document.querySelector(s); if (!el) return null; const b = el.getBoundingClientRect(); const cs = getComputedStyle(el); return { l: Math.round(b.left * 10) / 10, r: Math.round(b.right * 10) / 10, padL: cs.paddingLeft, padR: cs.paddingRight }; };
      const content = (s) => { const el = document.querySelector(s); if (!el) return null; const b = el.getBoundingClientRect(); const cs = getComputedStyle(el); return { cl: Math.round((b.left + parseFloat(cs.paddingLeft)) * 10) / 10, cr: Math.round((b.right - parseFloat(cs.paddingRight)) * 10) / 10 }; };
      return {
        bodyContent: (() => { const cs = getComputedStyle(document.body); const b = document.body.getBoundingClientRect(); return { l: parseFloat(cs.paddingLeft), r: Math.round((b.width - parseFloat(cs.paddingRight)) * 10) / 10 }; })(),
        masthead: L('.masthead'),
        mastInnerBox: L('.mast-inner'),
        mastInnerContent: content('.mast-inner'),
        brand: L('.brand'),
        nav: L('.nav'),
        container: L('main.container'),
        heroName: L('.hero-name'),
        tocLegend: L('.toc .kicker'),
        sectionTitle: L('.section-title'),
        indexNum: L('.index-num'),
        footer: L('.foot-inner'),
        footBrand: L('.foot-brand'),
      };
    });
    console.log('W' + w, JSON.stringify(r));
    await ctx.close();
  }
  await b.close();
})();
