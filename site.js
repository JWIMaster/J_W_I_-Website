/* J_W_I_ shared behaviour: masthead metric, copy buttons,
   scroll-linked fades, and the typewriter lead on article/guide pages. */
(function () {
  'use strict';

  /* Keep the --mast-h metric in sync with the (variable-height) sticky masthead. */
  var mast = document.querySelector('.masthead');
  var nav = document.querySelector('.nav');
  function syncMast() {
    if (!mast) return;
    document.documentElement.style.setProperty('--mast-h', mast.offsetHeight + 'px');
  }
  /* On the stacked mobile masthead, keep the current page's link in view so the
     active underline never parks behind the clipped edge. */
  function syncNav() {
    if (!nav || window.innerWidth >= 720) return;
    var active = nav.querySelector('a[aria-current="page"]');
    if (!active) return;
    var left = active.getBoundingClientRect().left - nav.getBoundingClientRect().left;
    if (nav.scrollLeft !== left - 12) nav.scrollLeft = left - 12;
  }
  if (mast) {
    syncMast();
    syncNav();
    window.addEventListener('resize', function () { syncMast(); syncNav(); });
    window.addEventListener('orientationchange', function () { syncMast(); syncNav(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { syncMast(); syncNav(); });
  }

  function legacyCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) { /* ignore */ }
    document.body.removeChild(ta);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(function () {
        legacyCopy(text);
      });
    }
    legacyCopy(text);
    return Promise.resolve();
  }

  function flash(btn) {
    var original = btn.dataset.label || btn.textContent;
    btn.dataset.label = original;
    btn.classList.add('ok');
    btn.textContent = 'Copied ✓';
    btn.disabled = true;
    setTimeout(function () {
      btn.classList.remove('ok');
      btn.textContent = original;
      btn.disabled = false;
    }, 1600);
  }

  /* <button data-copy-target="#id">Copy</button> → copy the target's text. */
  function wireCopyButtons(root) {
    (root || document).querySelectorAll('[data-copy-target]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var target = document.querySelector(btn.getAttribute('data-copy-target'));
        if (!target) return;
        var text = target.innerText.replace(/^\n+/, '').replace(/\s+$/, '');
        copyText(text);
        flash(btn);
      });
    });
  }
  wireCopyButtons();

  /* Scroll reveals: .fade-io fades in the first time it enters the viewport
     and stays — the fade plays on the way in and never un-plays. */
  function wireScrollFades() {
    if (!('IntersectionObserver' in window)) return;
    var els = document.querySelectorAll('.fade-io');
    if (!els.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('is-in');
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.05 });
    Array.prototype.forEach.call(els, function (el) { io.observe(el); });
  }
  wireScrollFades();

  /* Typing plays on every load. */
  function motionOK() {
    return !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  /* Typewriter lead: the lead fades in while its first sentence(s) type at a
     fast, model-like cadence; when the typing settles, the remaining
     sentences and the blocks in data-typewrite-then fade in. */
  function typewriteLead() {
    var lead = document.querySelector('[data-typewrite]');
    if (!lead) return;
    if (!motionOK()) return;

    var text = lead.textContent.replace(/\s+/g, ' ').trim();
    var sentences = text.match(/[^.!?]+[.!?]*/g) || [text];
    var n = parseInt(lead.getAttribute('data-typewrite'), 10) || sentences.length;
    var typed = sentences.slice(0, n).join(' ');
    var restText = sentences.slice(n).join(' ');

    var typedEl = document.createElement('span');
    typedEl.className = 'tw-cursor';
    var restEl = null;
    if (restText) {
      restEl = document.createElement('span');
      restEl.className = 'tw-rest';
      restEl.textContent = ' ' + restText;
    }
    lead.textContent = '';
    lead.appendChild(typedEl);
    if (restEl) lead.appendChild(restEl);

    /* the lead itself fades in in parallel with the typing */
    lead.classList.add('tw-lead');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { lead.classList.add('tw-lead-in'); });
    });

    var thenSel = lead.getAttribute('data-typewrite-then');
    var restEls = thenSel
      ? Array.prototype.slice.call(document.querySelectorAll(thenSel))
      : [];
    restEls.forEach(function (el) { el.classList.add('tw-rest'); });

    function finish() {
      typedEl.classList.remove('tw-cursor');
      lead.classList.remove('tw-lead', 'tw-lead-in');
      var rest = [];
      if (restEl) rest.push(restEl);
      rest = rest.concat(restEls);
      rest.forEach(function (el, k) {
        setTimeout(function () { el.classList.add('tw-in'); }, 140 + k * 120);
      });
      /* hand the elements back to the scroll-fade system once the intro settles */
      setTimeout(function () {
        rest.forEach(function (el) { el.classList.remove('tw-rest', 'tw-in'); });
      }, 140 + rest.length * 120 + 950);
    }

    var i = 0;
    (function step() {
      i += 1;
      typedEl.textContent = typed.slice(0, i);
      if (i < typed.length) setTimeout(step, 9 + Math.random() * 9);
      else finish();
    })();
  }
  typewriteLead();

  /* The J_W_I_ wordmark types itself out once, letter by letter, on the home
     page; the DOM is restored to its authored markup when it settles. */
  function typeHeroName() {
    var name = document.querySelector('.hero-name');
    if (!name || !motionOK()) return;

    var original = name.innerHTML;
    var chars = [];
    Array.prototype.forEach.call(name.childNodes, function (node) {
      var u = node.nodeType === 1 ? ' u' : '';
      var s = node.textContent;
      for (var c = 0; c < s.length; c += 1) {
        var ch = document.createElement('span');
        ch.className = 'hero-ch' + u;
        ch.textContent = s.charAt(c);
        name.appendChild(ch);
        chars.push(ch);
      }
    });
    name.textContent = '';
    chars.forEach(function (ch) { name.appendChild(ch); });

    var i = 0;
    (function step() {
      i += 1;
      chars[i - 1].classList.add('on');
      if (i < chars.length) setTimeout(step, 80 + Math.random() * 40);
      else setTimeout(function () { name.innerHTML = original; }, 150);
    })();
  }
  typeHeroName();
})();
