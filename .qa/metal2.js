const { chromium } = require('playwright');
const BASE = 'http://127.0.0.1:8123';
let pass = 0, fail = 0;
const ck = (n, ok, d) => { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + n + (d ? '  [' + d + ']' : '')); };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 3 });
  const p = await ctx.newPage();
  await p.goto(BASE + '/index.html', { waitUntil: 'networkidle' });
  await p.evaluate(() => (document.fonts ? document.fonts.ready : Promise.resolve())).catch(() => {});
  await p.waitForTimeout(1600);

  const clip = await p.evaluate(() => {
    const r = document.querySelector('.hero-name').getBoundingClientRect();
    return { x: Math.max(0, Math.round(r.left) - 24), y: Math.max(0, Math.round(r.top) - 24), width: Math.round(r.width) + 48, height: Math.round(r.height) + 56 };
  });

  const anims = await p.evaluate(() => document.querySelector('.hero-name .hero-glyph:not(.u)').getAnimations().map((a) => a.animationName));
  ck('letters carry both the landing and the material loop', anims.includes('wordmark-land') && anims.includes('metal-life'), anims.join(','));

  const hold = (t) => p.evaluate((tt) => {
    document.querySelectorAll('.hero-name .hero-glyph:not(.u)').forEach((el) => {
      el.getAnimations().forEach((a) => { if (a.animationName === 'metal-life') { a.pause(); a.currentTime = tt; } });
    });
  }, t);
  const pos = () => p.evaluate(() => getComputedStyle(document.querySelector('.hero-name .hero-glyph:not(.u)')).backgroundPosition);
  await hold(0);   const p0 = await pos();
  await hold(7200); const p1 = await pos();
  ck('the reflected room drifts and the glint passes over time', p0 !== p1, p0 + '  ->  ' + p1);

  for (const [t, name] of [[0, 'rest'], [2500, 'glint'], [7200, 'drift']]) {
    await hold(t);
    await p.waitForTimeout(120);
    await p.screenshot({ path: `shots/polish/metal_${name}.png`, clip });
  }

  /* the pointer moves the reflection */
  await hold(0);
  await p.evaluate(() => { const el = document.querySelector('.hero-name'); el.style.removeProperty('--metal-hl'); });
  const before = await p.evaluate(() => getComputedStyle(document.querySelector('.hero-name .hero-glyph:not(.u)')).backgroundImage.slice(-90));
  const box = await p.evaluate(() => { const r = document.querySelector('.hero-name').getBoundingClientRect(); return { l: r.left, t: r.top, w: r.width, h: r.height }; });
  await p.mouse.move(box.l + box.w * 0.85, box.t + box.h * 0.5);
  await p.waitForTimeout(600);
  const after = await p.evaluate(() => ({ v: document.querySelector('.hero-name').style.getPropertyValue('--metal-hl'), img: getComputedStyle(document.querySelector('.hero-name .hero-glyph:not(.u)')).backgroundImage.slice(-90) }));
  ck('pointer moves the highlight across the surface', after.v && after.img !== before, '--metal-hl=' + after.v);
  await p.screenshot({ path: 'shots/polish/metal_pointer.png', clip });
  await p.mouse.move(10, 10);
  await p.waitForTimeout(500);
  const left = await p.evaluate(() => document.querySelector('.hero-name').style.getPropertyValue('--metal-hl'));
  ck('reflection settles back when the pointer leaves', left === '', '--metal-hl="' + left + '"');

  /* cost: frame pacing while the loop runs */
  const frames = await p.evaluate(() => new Promise((res) => {
    document.querySelectorAll('.hero-name .hero-glyph:not(.u)').forEach((el) => el.getAnimations().forEach((a) => a.play()));
    const ts = []; let last = performance.now(); let n = 0;
    (function tick(now) { ts.push(now - last); last = now; if (++n < 90) requestAnimationFrame(tick); else res(ts.slice(5)); })(performance.now());
  }));
  const avg = frames.reduce((a, c) => a + c, 0) / frames.length;
  const worst = Math.max(...frames);
  ck('the loop holds a smooth frame pace', avg < 20 && worst < 60, 'avg ' + avg.toFixed(1) + 'ms, worst ' + worst.toFixed(1) + 'ms');

  const st = await p.evaluate(() => { const r = document.querySelector('.hero-name').getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), ovf: document.documentElement.scrollWidth - document.documentElement.clientWidth }; });
  ck('wordmark box unchanged, no overflow', st.ovf <= 0 && st.h > 0, JSON.stringify(st));
  await ctx.close();

  /* reduced motion: a lit surface, nothing moving */
  const c2 = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const p2 = await c2.newPage();
  await p2.goto(BASE + '/index.html', { waitUntil: 'networkidle' });
  await p2.waitForTimeout(500);
  const rm = await p2.evaluate(() => {
    const g = document.querySelector('.hero-name .hero-glyph:not(.u)');
    return { anims: g.getAnimations().length, clip: getComputedStyle(g).webkitBackgroundClip || getComputedStyle(g).backgroundClip, pos: getComputedStyle(g).backgroundPosition, hl: document.querySelector('.hero-name').style.getPropertyValue('--metal-hl') };
  });
  ck('reduced motion: material present, nothing animating or pointer-driven', rm.anims === 0 && String(rm.clip).indexOf('text') === 0 && rm.hl === '', JSON.stringify(rm));
  await c2.close();
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  await b.close();
  process.exit(fail ? 1 : 0);
})();
