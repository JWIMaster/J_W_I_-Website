const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  for (const w of [375, 1920]) {
    const p = await (await b.newContext({ viewport: { width: w, height: 700 } })).newPage();
    await p.goto('http://127.0.0.1:8123/swiftonios6guidepart1.html', { waitUntil: 'networkidle' });
    await p.waitForTimeout(600);
    const r = await p.evaluate(() => {
      const de = document.documentElement, body = document.body;
      const wiz = document.querySelector('#wizard'), mast = document.querySelector('.masthead');
      const cs = el => getComputedStyle(el);
      return {
        bodyClass: body.className, htmlClass: de.className,
        mastH_html: cs(de).getPropertyValue('--mast-h').trim(),
        mastH_body: cs(body).getPropertyValue('--mast-h').trim(),
        mastH_mast: mast ? cs(mast).getPropertyValue('--mast-h').trim() : null,
        mastH_wiz: wiz ? cs(wiz).getPropertyValue('--mast-h').trim() : null,
        wiz_top_computed: wiz ? cs(wiz).top : null,
        wiz_rect: wiz ? { top: wiz.getBoundingClientRect().top, h: wiz.offsetHeight } : null,
        mast_rect: mast ? { top: mast.getBoundingClientRect().top, bottom: mast.getBoundingClientRect().bottom, h: mast.offsetHeight } : null,
        mast_fixed: mast ? cs(mast).position : null,
        scripts: [...document.querySelectorAll('script[src]')].map(s => s.src.split('/').pop()),
      };
    });
    console.log(`\n== ${w}px ==`);
    for (const [k, v] of Object.entries(r)) console.log(' ', k, ':', JSON.stringify(v));
    await p.close();
  }
  await b.close();
})();
