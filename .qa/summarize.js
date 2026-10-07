'use strict';
/* Summarize responsive mode results: overflow, wraps, mast/nav, wizard gaps, headings. */
const fs = require('fs');
const path = require('path');
const file = process.argv[2] || 'sweep';
const rows = JSON.parse(fs.readFileSync(path.join(__dirname, 'resp', file + '.json'), 'utf8'));

const group = (r) => `${r.page}@${r.w}` + (r.z && r.z !== 100 ? ` z${r.z}` : '') + (r.dir ? ` ${r.dir}` : '') + (r.stop !== undefined ? ` s${r.stop}` : '');

console.log(`== ${file}: ${rows.length} records ==\n`);

const sec = (title, pred, fmt) => {
  const hit = rows.filter(pred);
  console.log(`--- ${title} (${hit.length}) ---`);
  for (const r of hit) console.log(`  ${group(r)}: ${fmt(r)}`);
  if (!hit.length) console.log('  (none)');
  console.log('');
};

sec('HORIZONTAL OVERFLOW', (r) => r.overflow, (r) =>
  `vw=${r.vw} sw=${r.sw} bw=${r.bw} culprits=[${(r.culprits || []).map((c) => c.s + ' l' + c.l + ' r' + c.r + ' w' + c.w).join(' | ') || '-'}]`);

sec('WIZARD FRAME OVERLAPS MASTHEAD (gap<0)', (r) => r.wizGap !== undefined && r.wizGap < 0, (r) =>
  `gap=${r.wizGap} mastH=${r.css && r.css.mastHVar} mastHActual=${r.mast && r.mast.h}`);

sec('NAV: active link clipped / nav overflow', (r) =>
  (r.nav && r.nav.active && !r.nav.active.inView) || (r.nav && r.nav.sw > r.nav.cw + 1), (r) =>
  `navSw=${r.nav.sw} navCw=${r.nav.cw} activeL=${r.nav.active && r.nav.active.l} activeR=${r.nav.active && r.nav.active.r} linkW=${(r.nav.linkW || []).join('/')}`);

sec('BUTTON LABELS WRAPPED', (r) => (r.btns || []).some((b) => b.wrapped && !b.hidden), (r) =>
  r.btns.filter((b) => b.wrapped && !b.hidden).map((b) => `"${b.t}" ${b.w}x${b.h}`).join(' | '));

sec('H1/H2 LINE COUNTS >1', (r) => (r.h1 || []).some((x) => x.lines > 1) || (r.h2 || []).some((x) => x.lines > 1), (r) =>
  [...(r.h1 || []).filter((x) => x.lines > 1).map((x) => `h1 "${x.t}" x${x.lines}`),
   ...(r.h2 || []).filter((x) => x.lines > 1).map((x) => `h2 "${x.t}" x${x.lines}`)].join(' | '));

sec('IMAGE OUT OF FRAME', (r) => (r.imgs || []).some((i) => i.out === true), (r) =>
  r.imgs.filter((i) => i.out).map((i) => `${i.a} ${i.w}x${i.h}`).join(' | '));

sec('WIZ-VIEWPORT overflow class mismatch', (r) =>
  r.wv && ((r.wv.sh > r.wv.ch + 1 && !r.wv.cls.includes('is-overflow')) || (r.wv.sh <= r.wv.ch + 1 && r.wv.cls.includes('is-overflow'))), (r) =>
  `sh=${r.wv.sh} ch=${r.wv.ch} cls="${r.wv.cls}"`);

// mast height sanity: var vs actual
const mastMism = rows.filter((r) => r.css && r.css.mastHVar && r.mast && parseInt(r.css.mastHVar) !== r.mast.h);
console.log(`--- MAST --mast-h vs actual (${mastMism.length}) ---`);
for (const r of mastMism) console.log(`  ${group(r)}: var=${r.css.mastHVar} actual=${r.mast.h} mq=[${r.mq.join(',')}]`);
console.log('');

// footer stacking
console.log('--- FOOTER (multi-row check, mobile only) ---');
for (const r of rows.filter((x) => x.w <= 430 && x.foot)) {
  const tops = new Set(r.foot.map((f) => f.t));
  if (tops.size > 2) console.log(`  ${group(r)}: rows=${tops.size} ` + r.foot.map((f) => f.s + '@' + f.t).join(' '));
}
console.log('');
console.log('--- BREAKPOINT MAP (which MQs active per width) ---');
for (const r of rows.filter((x) => x.mode === 'sweep' && !x.page.includes('s12') && !x.page.includes('nojs'))) {
  console.log(`  ${group(r)}: [${r.mq.join(',') || 'none'}]`);
}
