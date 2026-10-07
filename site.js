/* J_W_I_ shared behaviour: masthead metric, copy buttons,
   scroll-linked fades, and the intro fade on article/guide pages. */
(function () {
  'use strict';

  /* Keep the --mast-h metric in sync with the (variable-height) sticky masthead. */
  var mast = document.querySelector('.masthead');
  var nav = document.querySelector('.nav');
  function syncMast() {
    if (!mast) return;
    /* The masthead is sticky (top: 0) with a 10px top margin, so its rendered
       bottom edge is scroll-dependent: at rest (scrollY 0) it sits 10px below
       its own height, but once the page scrolls the element sticks and the
       margin is absorbed, pulling the bottom edge up by the same 10px.
       getBoundingClientRect() therefore returns two different values for the
       same masthead. --mast-h must be the *stable* at-rest bottom —
       offsetHeight + the computed top margin — never rect.bottom: the wizard's
       fixed shell (top: var(--mast-h)) and the .wiz-main stage height need one
       constant that clears the at-rest masthead in every scroll state.
       Measuring rect.bottom made the shell jump 10px whenever the last resize
       event fired while the page was scrolled, re-introducing a 10px overlap
       under the at-rest masthead. (offsetHeight alone was the original bug:
       it omitted the 10px margin, so the shell started under the masthead.) */
    var cs = getComputedStyle(mast);
    var topMargin = parseFloat(cs.marginTop) || 0;
    document.documentElement.style.setProperty('--mast-h', mast.offsetHeight + topMargin + 'px');
  }
  /* On the stacked mobile masthead, keep the current page's link in view so the
     active underline never parks behind the clipped edge. */
  function syncNav() {
    if (!nav || window.innerWidth >= 720) return;
    /* the row is centered when it fits — only scroll when it overflows */
    if (nav.scrollWidth <= nav.clientWidth + 1) { nav.scrollLeft = 0; return; }
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

  /* Motion gate for the intro fade (also used by the wizard — exposed on
     window so other scripts can share the same preference check). */
  function motionOK() {
    return !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  window.motionOK = motionOK;

  /* Intro fade: on every load the lead and the blocks named in
     data-typewrite-then fade in together — no typing, no pauses. */
  function fadeIntro() {
    var lead = document.querySelector('[data-typewrite]');
    if (!lead) return;
    if (!motionOK()) return;

    var thenSel = lead.getAttribute('data-typewrite-then');
    var restEls = thenSel
      ? Array.prototype.slice.call(document.querySelectorAll(thenSel))
      : [];

    lead.classList.add('tw-lead');
    restEls.forEach(function (el) { el.classList.add('tw-rest'); });

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        lead.classList.add('tw-lead-in');
        restEls.forEach(function (el) { el.classList.add('tw-in'); });
      });
    });

    /* hand the elements back to the scroll-fade system once the intro settles */
    setTimeout(function () {
      lead.classList.remove('tw-lead', 'tw-lead-in');
      restEls.forEach(function (el) { el.classList.remove('tw-rest', 'tw-in'); });
    }, 1100);
  }
  fadeIntro();
})();
