/* Visual + geometric proof for the stable --mast-h fix.
   Sequence per viewport: load guide -> open wizard (OS card) -> at-rest state,
   then scroll (if the page can scroll) -> then resize WHILE SCROLLED (the exact
   sequence that produced the persistent 10px overlap under the old rect().bottom
   syncMast), then scroll back to top. Measures masthead/wizard rects + the
   --mast-h custom property at every state and screenshots the top strip. */
const { chromium } = require('playwright');
const BASE = 'file:///Users/jwalr/J_W_I_-Website/swiftonios6guidepart1.html';

async function probe(p) {
  return p.evaluate(() => {
    const mast = document.querySelector('.masthead');
    const wiz = document.querySelector('#wizard');
    const cs = getComputedStyle(document.documentElement);
    const mr = mast.getBoundingClientRect();
    const wr = wiz ? wiz.getBoundingClientRect() : null;
    return {
      scrollY: window.scrollY,
      maxScroll: document.documentElement.scrollHeight - window.innerHeight,
      mastHVar: cs.getPropertyValue('--mast-h').trim(),
      mast: { top: mr.top, bottom: mr.bottom, h: mr.height },
      wiz: wr ? { top: wr.top, bottom: wr.bottom } : null,
      wizGap: wr ? Math.round((wr.top - mr.bottom) * 100) / 100 : null,
    };
  });
}

(async () => {
  const b = await chromium.launch();
  for (const [name, w, h] of [['m390', 390, 844], ['d1024', 1024, 768]]) {
    const p = await b.newPage();
    await p.setViewportSize({ width: w, height: h });
    await p.goto(BASE, { waitUntil: 'load' });
    await p.waitForTimeout(600);
    console.log(`\n=== ${name} (${w}x${h}) wizard pre-open ===`);
    console.log(JSON.stringify(await probe(p)));

    // open the wizard (same flow the functional runners use)
    await p.click('.os-card:has-text("Monterey")');
    await p.waitForTimeout(900);
    console.log(`--- ${name} wizard OPEN, at rest ---`);
    console.log(JSON.stringify(await probe(p)));
    await p.screenshot({ path: `shots/wizstable_${name}_atrest.png`, clip: { x: 0, y: 0, width: w, height: 240 } });

    // scroll down as far as the page allows
    await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await p.waitForTimeout(400);
    console.log(`--- ${name} wizard OPEN, scrolled to bottom ---`);
    console.log(JSON.stringify(await probe(p)));
    await p.screenshot({ path: `shots/wizstable_${name}_scrolled.png`, clip: { x: 0, y: 0, width: w, height: 240 } });

    // THE FAILURE SEQUENCE: resize while scrolled (fires syncMast in stuck state)
    const w2 = name === 'm390' ? 360 : 1024;
    await p.setViewportSize({ width: w2, height: h });
    await p.waitForTimeout(500);
    console.log(`--- ${name} RESIZED to ${w2}x${h} WHILE SCROLLED ---`);
    console.log(JSON.stringify(await probe(p)));
    await p.screenshot({ path: `shots/wizstable_${name}_resized-scrolled.png`, clip: { x: 0, y: 0, width: w2, height: 240 } });

    // scroll back to top (browser clamp on reflow) and verify final state
    await p.evaluate(() => window.scrollTo(0, 0));
    await p.waitForTimeout(400);
    console.log(`--- ${name} back at top (final) ---`);
    console.log(JSON.stringify(await probe(p)));
    await p.screenshot({ path: `shots/wizstable_${name}_final-top.png`, clip: { x: 0, y: 0, width: w2, height: 240 } });
    await p.close();
  }
  await b.close();
  console.log('\ndone');
})();
