(() => {
  const vw = document.documentElement.clientWidth;
  const hits = [];
  // 1. text nodes whose range rect sticks out
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n, count = 0;
  const inScroller = (el) => {
    let a = el.parentElement;
    while (a) {
      const o = getComputedStyle(a);
      if (/(auto|scroll|hidden)/.test(o.overflowX)) {
        const srb = a.getBoundingClientRect();
        if (srb.right <= vw + 1 && srb.left >= -1) return true;
      }
      a = a.parentElement;
    }
    return false;
  };
  while ((n = tw.nextNode()) && count < 20000) {
    if (!n.nodeValue.trim()) continue;
    if (inScroller(n.parentElement)) continue;
    count++;
    const r = document.createRange();
    r.selectNodeContents(n);
    const rects = r.getClientRects();
    for (const rc of rects) {
      if (rc.right > vw + 1 || rc.left < -1) {
        hits.push({ kind: 'text', parent: n.parentElement.tagName + '.' + ((n.parentElement.className||'').toString().slice(0,24)),
                    text: n.nodeValue.trim().slice(0, 36), l: Math.round(rc.left), r: Math.round(rc.right) });
        break; // one hit per node
      }
    }
  }
  // 2. pseudo-elements
  for (const el of document.querySelectorAll('body *')) {
    for (const ps of ['::before', '::after']) {
      const cs = getComputedStyle(el, ps);
      if (cs.content === 'none' || cs.content === 'normal') continue;
      const r = el.getBoundingClientRect();
      // pseudo boxes are not directly measurable; approximate via element + known offsets
      const w = parseFloat(cs.width) || 0;
      if (w > vw) hits.push({ kind: 'pseudo' + ps, el: el.tagName + '.' + ((el.className||'').toString().slice(0,24)), w: Math.round(w) });
    }
  }
  // 3. dedupe + sort
  const seen = new Set(); const out = [];
  for (const h of hits) { const k = JSON.stringify(h); if (seen.has(k)) continue; seen.add(k); out.push(h); }
  out.sort((a, b) => (b.r || b.w || 0) - (a.r || a.w || 0));
  window.__probeout = JSON.stringify({ vw, n: out.length, hits: out.slice(0, 12) }, null, 1);
})();
