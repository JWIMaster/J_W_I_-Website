/* Compare the pre-fix baseline (.qa/a2-pre) with the post-fix run (.qa/a2).
   Prints, per mode, the before/after count for every finding class and lists
   anything that got WORSE (regressions). */
const fs = require('fs');
const MODES = ['sweep', 'zoom', 'resize', 'scroll', 'motion', 'interact'];
const load = (dir, m) => {
  const f = `${dir}/${m}.json`;
  if (!fs.existsSync(f)) return null;
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  return Array.isArray(d) ? d : [d];
};
const id = (r) => [r.url, 'W' + (r.W || '?'), 'z' + (r.zoom || 100), r.vw ? 'vw' + r.vw : '', r.stop || '', r.reduced ? 'RM' : '', r.nojs ? 'NOJS' : '', r.check || ''].filter(Boolean).join(' ');

/* an os-card/path-card "two-line" reading is the design's two-row label, not a wrap */
const realMulti = (r) => (r.btnMulti || []).filter((b) => !/^(Mojave|Big Sur|Monterey|Templates|Manual)/.test(b));

const CLASSES = {
  'doc/element overflow': (r) => (r.docOverflowX || 0) > 0 || (r.offscreenN || 0) > 0,
  'text escaping box': (r) => (r.textOverflowN || 0) > 0,
  'multi-line buttons': (r) => realMulti(r).length > 0,
  'clipped text': (r) => (r.clippedN || 0) > 0,
  'text < 11.5px': (r) => (r.tinyTextN || 0) > 0,
  'invisible text blocks': (r) => (r.hiddenTextBlocks || 0) > 0,
  'broken/loading images': (r) => (r.imgsBroken || []).length > 0,
  'wizard/masthead overlap': (r) => typeof r.wizGap === 'number' && r.wizGap < -0.5,
  'masthead over content': (r) => !!r.mastOverlap,
  'runtime errors': (r) => !!r.fatal || (r.console || []).length > 0,
  'small tap targets': (r) => (r.btnSmall || []).length > 0,
};

let worseTotal = 0;
for (const m of MODES) {
  const pre = load('.qa/a2-pre', m);
  const post = load('.qa/a2', m);
  if (!pre || !post) { console.log(`\n### ${m}: missing (pre=${!!pre} post=${!!post})`); continue; }
  console.log(`\n### ${m}  (${pre.length} → ${post.length} records)`);
  for (const [name, fn] of Object.entries(CLASSES)) {
    const a = pre.filter(fn).length, b = post.filter(fn).length;
    if (!a && !b) continue;
    const mark = b > a ? '  <-- WORSE' : b < a ? '  improved' : '';
    console.log(`  ${name.padEnd(24)} ${String(a).padStart(4)} → ${String(b).padStart(4)}${mark}`);
    if (b > a) {
      worseTotal++;
      const preKeys = new Set(pre.filter(fn).map(id));
      post.filter(fn).filter((r) => !preKeys.has(id(r))).slice(0, 6).forEach((r) => console.log('      new:', id(r), JSON.stringify(realMulti(r).length ? realMulti(r) : (r.offscreen || r.textOverflow || r.clipped || r.btnSmall || [])).slice(0, 170)));
    }
  }
}
console.log('\nregression classes:', worseTotal);
