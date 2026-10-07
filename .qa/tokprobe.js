(() => {
  const vw = document.documentElement.clientWidth;
  const hits = [];
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = tw.nextNode())) {
    if (!n.nodeValue.trim()) continue;
    const r = document.createRange(); r.selectNodeContents(n);
    for (const rc of r.getClientRects()) {
      if (rc.right > vw + 1) { hits.push({ text: n.nodeValue.trim(), w: Math.round(rc.width) }); break; }
    }
  }
  // find the longest word-like token in each hit
  const out = hits.slice(0, 6).map(h => {
    const tokens = h.text.split(/\s+/);
    const long = tokens.filter(t => t.length > 12).slice(0, 5);
    return { len: h.text.length, w: h.w, head: h.text.slice(0, 60), long };
  });
  window.__probeout = JSON.stringify({ vw, out }, null, 1);
})();
