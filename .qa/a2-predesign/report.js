/* Digest of .qa/a2/*.json — prints only actionable findings. */
const fs = require('fs');
const MODES = process.argv.slice(2).length ? process.argv.slice(2) : ['sweep', 'motion', 'interact', 'scroll', 'resize', 'zoom'];
const files = MODES.filter((m) => fs.existsSync(`.qa/a2/${m}.json`));
const all = [];
for (const m of files) {
  const data = JSON.parse(fs.readFileSync(`.qa/a2/${m}.json`, 'utf8'));
  (Array.isArray(data) ? data : [data]).forEach((r) => all.push(Object.assign({ mode: m }, r)));
}
const id = (r) => [r.mode, r.url, 'W' + (r.W || '?'), 'z' + (r.zoom || 100), r.vw ? 'vw' + r.vw : '', r.stop ? 'stop:' + r.stop : '', r.reduced ? 'RM' : '', r.nojs ? 'NOJS' : ''].filter(Boolean).join(' ');
const uniq = (arr) => [...new Set(arr)];
console.log('records:', all.length, 'from', files.join(','));

const fail = all.filter((r) => r.fatal || (r.console && r.console.length) || (r.failed && r.failed.length));
console.log('\n### runtime errors (' + fail.length + ')');
fail.slice(0, 12).forEach((r) => console.log(' ', id(r), '|', r.fatal || '', (r.console || []).join(';').slice(0, 120), (r.failed || []).join(',')));

const ovf = all.filter((r) => (r.docOverflowX || 0) > 0 || (r.offscreenN || 0) > 0);
console.log('\n### horizontal overflow (' + ovf.length + ')');
ovf.slice(0, 25).forEach((r) => console.log(' ', id(r), 'doc+' + r.docOverflowX, 'els:' + r.offscreenN, (r.offscreen || []).slice(0, 3).join(' | ')));

const txt = all.filter((r) => (r.textOverflowN || 0) > 0);
console.log('\n### text escaping its box (' + txt.length + ')');
txt.slice(0, 20).forEach((r) => console.log(' ', id(r), (r.textOverflow || []).slice(0, 3).join(' | ')));

const bm = all.filter((r) => (r.btnMulti || []).length);
console.log('\n### multi-line buttons (' + bm.length + ' records)');
const bmT = {};
bm.forEach((r) => { (r.btnMulti || []).forEach((b) => { const k = b.replace(/\(\d+px,\d+L\)/, ''); bmT[k] = bmT[k] || []; bmT[k].push(id(r)); }); });
Object.keys(bmT).slice(0, 14).forEach((k) => console.log('  "' + k + '" ×' + bmT[k].length, 'e.g.', bmT[k].slice(0, 3).join(' / ')));

const bs = all.filter((r) => (r.btnSmall || []).length);
console.log('\n### small tap targets (' + bs.length + ' records)');
const bsT = {};
bs.forEach((r) => { (r.btnSmall || []).forEach((b) => { bsT[b] = bsT[b] || []; bsT[b].push(id(r)); }); });
Object.keys(bsT).slice(0, 12).forEach((k) => console.log('  ' + k + ' ×' + bsT[k].length, 'e.g.', bsT[k].slice(0, 2).join(' / ')));

const cl = all.filter((r) => (r.clippedN || 0) > 0);
console.log('\n### clipped/truncated text (' + cl.length + ')');
cl.slice(0, 10).forEach((r) => console.log(' ', id(r), (r.clipped || []).slice(0, 2).join(' | ')));

const ty = all.filter((r) => (r.tinyTextN || 0) > 0);
console.log('\n### text under 11.5px (' + ty.length + ' records)');
const tyT = {};
ty.forEach((r) => { (r.tinyText || []).forEach((t) => { const k = t.replace(/\d+(\.\d+)?px/, ''); tyT[k] = tyT[k] || []; tyT[k].push(id(r)); }); });
Object.keys(tyT).slice(0, 12).forEach((k) => console.log('  ' + k + ' ×' + tyT[k].length, 'e.g.', tyT[k][0]));

const hid = all.filter((r) => (r.hiddenTextBlocks || 0) > 0);
console.log('\n### invisible text blocks (' + hid.length + ')');
hid.slice(0, 10).forEach((r) => console.log(' ', id(r), 'hidden:' + r.hiddenTextBlocks, 'reduced:' + r.reduced));

const broken = all.filter((r) => (r.imgsBroken || []).length);
console.log('\n### broken images (' + broken.length + ')');
broken.slice(0, 8).forEach((r) => console.log(' ', id(r), (r.imgsBroken || []).join(',')));

const wizg = all.filter((r) => typeof r.wizGap === 'number' && r.wizGap < -0.5);
console.log('\n### wizard/masthead overlap (' + wizg.length + ')');
wizg.slice(0, 12).forEach((r) => console.log(' ', id(r), 'gap=' + r.wizGap, 'mastVar=' + r.mastHVar, JSON.stringify(r.mast)));

const mo = all.filter((r) => r.mastOverlap);
console.log('\n### masthead covering content (' + mo.length + ')');
mo.slice(0, 12).forEach((r) => console.log(' ', id(r), '->', r.mastOverlap));

const ax = all.filter((r) => r.headingJumps || (r.h1 || []).length !== 1);
console.log('\n### heading structure oddities (' + ax.length + ')');
ax.slice(0, 8).forEach((r) => console.log(' ', id(r), 'h1s=' + JSON.stringify(r.h1), 'jumps=' + r.headingJumps));

/* interact checks */
const ic = all.filter((r) => r.check);
if (ic.length) { console.log('\n### interaction checks'); ic.forEach((r) => console.log(' ', r.check + ':', typeof r.result === 'object' ? JSON.stringify(r.result).slice(0, 400) : r.result)); }

/* mode-specific */
const nag = all.filter((r) => r.nav && r.nav.scrollable);
console.log('\n### nav rows that scroll (' + nag.length + ')');
console.log('  ' + uniq(nag.map((r) => 'vw' + r.vw)).slice(0, 14).join(', '));

const mastVars = uniq(all.filter((r) => r.mastHVar).map((r) => r.vw + ':' + r.mastHVar));
console.log('\n### --mast-h values:', mastVars.slice(0, 20).join(' '));

const noattr = all.filter((r) => r.imgsNoAttr > 0);
console.log('\n### images without width/height attrs:', uniq(noattr.map((r) => r.url)).join(', '), '(max ' + Math.max(0, ...noattr.map((r) => r.imgsNoAttr)) + ' per page)');

/* zoom sweep summary */
const zooms = all.filter((r) => r.mode === 'zoom');
if (zooms.length) {
  const bad = zooms.filter((r) => (r.docOverflowX || 0) > 0 || (r.offscreenN || 0) > 0 || (r.textOverflowN || 0) > 0);
  console.log('\n### zoom mode: ' + zooms.length + ' records, ' + bad.length + ' with overflow');
  bad.slice(0, 15).forEach((r) => console.log(' ', id(r), 'doc+' + r.docOverflowX, 'els:' + r.offscreenN, 'txt:' + r.textOverflowN));
}
