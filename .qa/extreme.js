const { chromium } = require('playwright');
const BASE = 'http://127.0.0.1:8123';
let pass = 0, fail = 0;
const ck = (n, ok, d) => { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + n + (d ? '  [' + d + ']' : '')); };
const PROBE = () => {
  const de = document.documentElement;
  const vw = de.clientWidth;
  const scroller = (el) => { let a = el; while (a && a !== de) { if (a.matches && a.matches('.code-screen, pre, .table-scroll, .nav')) { const cs = getComputedStyle(a); if (cs.overflowX === 'auto' || cs.overflowX === 'scroll') return true; } a = a.parentElement; } return false; };
  const off = [];
  document.querySelectorAll('body *').forEach((el) => {
    const cs = getComputedStyle(el);
    if (!cs || cs.display === 'none' || cs.visibility === 'hidden') return;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    if ((r.right > vw + 1 || r.left < -1) && !scroller(el)) off.push(el.tagName.toLowerCase() + '.' + String(el.className).split(' ')[0] + ' r=' + Math.round(r.right));
  });
  return { doc: de.scrollWidth - de.clientWidth, off: off.slice(0, 4), n: off.length };
};
(async () => {
  const b = await chromium.launch();
  for (const [w, z] of [[320, 200], [360, 200], [320, 175], [390, 200], [360, 150], [320, 150]]) {
    const vw = Math.round(w * 100 / z);
    for (const [name, url, wiz] of [['index', 'index.html', false], ['swift', 'swiftios6.html', false], ['support', 'support.html', false], ['guide', 'swiftonios6guidepart1.html', true]]) {
      const ctx = await b.newContext({ viewport: { width: vw, height: 700 } });
      const p = await ctx.newPage();
      await p.goto(BASE + '/' + url, { waitUntil: 'networkidle' });
      await p.evaluate(() => (document.fonts ? document.fonts.ready : Promise.resolve())).catch(() => {});
      if (wiz) { await p.click('.os-card:has-text("Monterey")').catch(() => {}); await p.waitForTimeout(550); }
      await p.waitForTimeout(200);
      const r = await p.evaluate(PROBE);
      ck(`${name} @vw${vw} (${w}@${z}%): clean`, r.doc <= 0 && r.n === 0, 'doc+' + r.doc + ' els:' + r.off.join('|'));
      await ctx.close();
    }
  }
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  await b.close();
  process.exit(fail ? 1 : 0);
})();
