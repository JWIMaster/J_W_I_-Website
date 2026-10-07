(() => {
  const els = [...document.querySelectorAll('strong, b, code, em, i')].map(e => {
    const r = e.getBoundingClientRect();
    return { t: e.tagName, cls: (e.className||'').toString(), w: Math.round(r.width), l: Math.round(r.left),
             text: (e.textContent||'').slice(0,50) };
  }).filter(x => x.w > 90).sort((a,b) => b.w - a.w).slice(0, 10);
  window.__probeout = JSON.stringify(els, null, 1);
})();
