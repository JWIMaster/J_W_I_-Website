/* Mobile formatting audit: capture every distinct wizard state at a given
   width plus geometry numbers (overlaps, clipping, spacing beats, centering)
   so fixes can be targeted. Two passes: template path (blocks 0-7) and
   manual path (blocks 0-4, 12-25). */
const { chromium } = require('playwright');
const fs = require('fs');
const URL = 'http://127.0.0.1:8123/swiftonios6guidepart1.html';
const W = parseInt(process.argv[2] || '320', 10);

const geo = (p) => p.evaluate(() => {
  const r = el => { if (!el) return null; const b = el.getBoundingClientRect(); return { l: Math.round(b.left), t: Math.round(b.top), r: Math.round(b.right), b: Math.round(b.bottom), w: Math.round(b.width), h: Math.round(b.height) }; };
  const de = document.documentElement;
  const q = s => document.querySelector(s);
  const mast = q('.masthead');
  const head = q('#wizard .section-head');
  const step = q('.wizard-step:not(.is-hidden)');
  const stepBody = step && step.querySelector('.step-body');
  const shot = step && step.querySelector('.shot');
  const controls = q('.wiz-controls');
  const back = q('#wiz-back');
  const nxt = q('#wiz-next');
  const prog = q('.wiz-progress');
  const nav = q('.nav');
  const vp = q('.wiz-viewport');
  const over = [], clip = [], overlaps = [];
  if (de.scrollWidth > de.clientWidth + 1) over.push('doc:' + (de.scrollWidth - de.clientWidth));
  document.querySelectorAll('body *').forEach(el => {
    const b = el.getBoundingClientRect();
    if (b.width > 0 && (b.right > de.clientWidth + 2 || b.left < -2)) {
      let inScr = false;
      for (let a = el.parentElement; a; a = a.parentElement) {
        const c = getComputedStyle(a);
        if ((c.overflowX === 'auto' || c.overflowX === 'scroll' || c.overflowX === 'hidden') && a.scrollWidth > a.clientWidth + 1) { inScr = true; break; }
      }
      if (!inScr) over.push(el.tagName + '.' + String(el.className).slice(0, 30));
    }
  });
  if (step && shot && stepBody) {
    const s = shot.getBoundingClientRect(), t = stepBody.getBoundingClientRect();
    if (s.top < t.bottom - 1 && s.left < t.right && s.right > t.left) overlaps.push('shot-over-body');
  }
  if (prog && nxt) {
    const a = prog.getBoundingClientRect(), n = nxt.getBoundingClientRect();
    if (a.top < n.bottom && n.top < a.bottom && a.left < n.right && a.right > n.left) overlaps.push('prog-over-next');
  }
  if (controls) {
    const c = controls.getBoundingClientRect();
    if (c.top > de.clientHeight + 1 || c.bottom > de.clientHeight + 2) clip.push('controls-below-viewport:' + Math.round(c.bottom - de.clientHeight));
  }
  const vw = de.clientWidth;
  const gaps = {
    mastToHead: head && mast ? r(head).t - r(mast).b : null,
    headToStep: step && head ? r(step).t - r(head).b : null,
    bodyToShot: stepBody && shot ? r(shot).t - r(stepBody).b : null,
    shotToBottom: shot ? Math.round(de.clientHeight - r(shot).b) : null,
    stepToControls: controls && step ? r(controls).t - r(step).b : null,
    controlsH: controls ? r(controls).h : null,
    btnGap: back && nxt ? r(nxt).l - r(back).r : null,
    nextCenter: nxt ? Math.round((r(nxt).l + r(nxt).r) / 2 - vw / 2) : null,
    controlsCenter: controls ? Math.round((r(controls).l + r(controls).r) / 2 - vw / 2) : null,
    progMarginTop: prog && nxt ? Math.round(r(prog).t - r(nxt).b) : null,
    navScroll: nav ? Math.round(nav.scrollLeft) : null,
    navOverflow: nav ? nav.scrollWidth > nav.clientWidth : null,
    vpOverflow: vp ? vp.scrollHeight > vp.clientHeight + 8 : null,
    vpClasses: vp ? vp.className : null,
    progCenter: prog ? Math.round((r(prog).l + r(prog).r) / 2 - vw / 2) : null,
    progH: prog ? r(prog).h : null,
    progressTextLeft: prog ? r(prog).l : null,
  };
  return {
    title: step ? ((step.querySelector('h3') || {}).textContent || '').slice(0, 30) : null,
    overflowX: de.scrollWidth - de.clientWidth, over, clip, overlaps, gaps,
    mastH: mast ? r(mast).h : null, viewportH: de.clientHeight,
    stepR: r(step), controlsR: r(controls), progressR: r(prog),
  };
});

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: W, height: W < 500 ? 720 : 800 }, deviceScaleFactor: W < 500 ? 2 : 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)); });
  p.on('pageerror', e => errs.push('pageerror: ' + e.message.slice(0, 160)));
  const tick = async () => { await p.click('#wiz-next'); await p.waitForTimeout(200); };
  const next = async () => { await p.click('#wiz-next'); await p.waitForTimeout(230); };
  const adv = async conf => { if (conf) await tick(); await next(); };
  const out = [];
  const shoot = async label => {
    const g = await geo(p);
    await p.screenshot({ path: `shots/audit_${W}_${label}.png` });
    out.push({ pos: label, ...g });
    const G = g.gaps;
    console.log(label, g.title, '| over:', g.over.length, '| ov:', g.overlaps, '| clip:', g.clip, '| mast→head:', G.mastToHead, 'head→step:', G.headToStep, 'body→shot:', G.bodyToShot, 'shot→bot:', G.shotToBottom, 'step→ctl:', G.stepToControls, 'ctlH:', G.controlsH, 'btnGap:', G.btnGap, 'nextC:', G.nextCenter, 'ctlC:', G.controlsCenter, 'progMT:', G.progMarginTop, 'progC:', G.progCenter, 'progH:', G.progH);
  };
  const goto = async () => { await p.goto(URL, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2400); };

  /* pass A: template path */
  await goto();
  await shoot('a0-os');
  await p.click('.os-card:has(input[value="monterey"])');
  await next();
  await shoot('a1-dl');
  await adv(true); await shoot('a2-xcode');
  await adv(true); await shoot('a3-rpath');
  await adv(true); await shoot('a4-branch');
  await p.click('.path-card:has(input[value="templates"])');
  await next(); await shoot('a5-tmpl');
  await adv(true); await shoot('a6-select');
  await adv(true); await shoot('a7-terminal');

  /* pass B: manual path */
  await goto();
  await shoot('b0-os');
  await p.click('.os-card:has(input[value="monterey"])');
  await next();
  await shoot('b1-dl');
  await adv(true); await shoot('b2-xcode');
  await adv(true); await shoot('b3-rpath');
  await adv(true); await shoot('b4-branch');
  await p.click('.path-card:has(input[value="manual"])');
  await next(); await shoot('b5-man1');
  await adv(true); await shoot('b6-man2');
  await adv(true); await shoot('b7-man3');
  await adv(true); await shoot('b8-man4');
  await adv(true); await shoot('b9-man5');
  await adv(true); await shoot('b10-man6');
  await adv(true); await shoot('b11-man7');
  await adv(true); await shoot('b12-man8');
  await adv(true); await shoot('b13-man9');
  await adv(true); await shoot('b14-man10');
  await adv(true); await shoot('b15-man11');
  await adv(true); await shoot('b16-man12');
  await adv(true); await shoot('b17-build');
  await tick(); // arm → green, build step still shown
  await shoot('b18-armed');
  await next();
  await shoot('b19-finale');
  /* masthead close-up */
  await p.locator('.masthead').screenshot({ path: `shots/audit_${W}_mast.png` });

  console.log('console-errors:', errs.length ? errs.join(' | ') : 'none');
  fs.writeFileSync(`shots/audit_${W}.json`, JSON.stringify(out, null, 1));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
