(() => {
  const vw = document.documentElement.clientWidth;
  const blocks = [...document.querySelectorAll('body *')].filter(el =>
    el.scrollWidth > el.clientWidth + 2 && el.offsetWidth < vw + 2 && el.offsetHeight > 0);
  const out = blocks.map(el => {
    const cs = getComputedStyle(el);
    return { tag: el.tagName, cls: (el.className||'').toString().slice(0,28),
             sw: el.scrollWidth, cw: el.clientWidth, ow: el.scrollWidth - el.clientWidth,
             wrap: cs.overflowWrap + '/' + cs.wordBreak + '/' + cs.whiteSpace,
             text: (el.textContent||'').replace(/\s+/g,' ').slice(0,60) };
  }).sort((a,b) => b.ow - a.ow).slice(0, 6);
  window.__probeout = JSON.stringify({ vw, out }, null, 1);
})();
