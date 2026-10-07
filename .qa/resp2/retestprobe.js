/* Retest probe — pure browser JS (no Playwright APIs). Sets window.__probeout.
   Reports everything the post-fix verification needs in one evaluate:
   page overflow, mast/wizard gap, hero size, token rects, button line counts,
   index-row column widths. */
(function () {
  var out = {
    iw: innerWidth,
    ih: innerHeight,
    ow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };

  var mast = document.querySelector('.masthead');
  if (mast) {
    out.mastBottom = +mast.getBoundingClientRect().bottom.toFixed(1);
    out.mastHVar = getComputedStyle(document.documentElement).getPropertyValue('--mast-h').trim();
  }

  var wiz = document.querySelector('#wizard');
  if (wiz) {
    var cs = getComputedStyle(wiz);
    if (cs.position === 'fixed') {
      out.wizTop = +wiz.getBoundingClientRect().top.toFixed(1);
      if (typeof out.mastBottom === 'number') out.wizGap = +(out.wizTop - out.mastBottom).toFixed(1);
    }
  }

  var hero = document.querySelector('.hero-name');
  if (hero) {
    var hr = hero.getBoundingClientRect();
    out.hero = { w: +hr.width.toFixed(1), l: +hr.left.toFixed(1), r: +hr.right.toFixed(1) };
  }

  function tokenRect(needle) {
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    var n;
    while ((n = walker.nextNode())) {
      var i = n.data.indexOf(needle);
      if (i < 0) continue;
      var r = document.createRange();
      r.setStart(n, i);
      r.setEnd(n, i + needle.length);
      var rect = r.getBoundingClientRect();
      return { w: +rect.width.toFixed(1), l: +rect.left.toFixed(1), r: +rect.right.toFixed(1), spill: +(rect.right - innerWidth).toFixed(1) };
    }
    return null;
  }
  out.tokNS = tokenRect('NSLayoutConstraint');
  out.tokPix = tokenRect('jwi.pixieset.com');

  out.btns = Array.prototype.map.call(
    document.querySelectorAll('.index-links .btn, .code-bar .btn'),
    function (b) {
      var tops = new Set();
      var walker = document.createTreeWalker(b, NodeFilter.SHOW_TEXT);
      var n;
      while ((n = walker.nextNode())) {
        if (!n.data.trim()) continue;
        var r = document.createRange();
        r.selectNodeContents(n);
        for (var i = 0; i < r.getClientRects().length; i++) tops.add(Math.round(r.getClientRects()[i].top));
      }
      return { t: b.innerText.replace(/\s+/g, ' ').trim().slice(0, 26), h: b.offsetHeight, lines: tops.size };
    }
  );

  var row = document.querySelector('.index-row');
  if (row) {
    var d = row.children[1];
    out.rowCol = d ? +d.getBoundingClientRect().width.toFixed(1) : null;
    out.rowOw = row.scrollWidth - row.clientWidth;
  }

  var nav = document.querySelector('.nav');
  if (nav) out.nav = { sw: nav.scrollWidth, cw: nav.clientWidth };

  window.__probeout = out;
})();
