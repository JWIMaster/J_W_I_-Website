/* J_W_I_ shared behaviour: masthead metric, copy buttons,
   scroll-linked fades, and the intro fade on article/guide pages. */
(function () {
  'use strict';

  /* Keep the --mast-h metric in sync with the (variable-height) sticky masthead. */
  var mast = document.querySelector('.masthead');
  var nav = document.querySelector('.nav');
  function syncMast() {
    if (!mast) return;
    /* Measure the scroll-independent height, including subpixels, plus the
       resting margin. offsetHeight rounds and left a small seam on phones;
       rect.bottom changes when the sticky header pins during scrolling. */
    var cs = getComputedStyle(mast);
    var topMargin = parseFloat(cs.marginTop) || 0;
    document.documentElement.style.setProperty('--mast-h', mast.getBoundingClientRect().height + topMargin + 'px');
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

    /* The masthead gains a shadow once it is pinned, so it reads as a layer
       above the page rather than a band that happens to sit there. */
    var mastTicking = false;
    function mastUpdate() {
      mastTicking = false;
      mast.classList.toggle('is-stuck', window.scrollY > 4);
    }
    function mastOnScroll() {
      if (mastTicking) return;
      mastTicking = true;
      requestAnimationFrame(mastUpdate);
    }
    window.addEventListener('scroll', mastOnScroll, { passive: true });
    mastUpdate();
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
    var els = Array.prototype.slice.call(document.querySelectorAll('.fade-io'));
    if (!els.length) return;
    var pending = els;

    function reveal(el) {
      el.classList.add('is-in');
    }

    /* Safety net. An IntersectionObserver only ever reports the *latest*
       state, so content the reader jumps past — scrollbar drag, the End key
       with instant scrolling, browser scroll restoration, an anchor jump —
       can cross the viewport between two observation frames and never be
       reported as intersecting. It then kept opacity 0 forever: permanently
       blank sections on an otherwise fine page. Anything whose top has reached
       or passed the viewport top has been reached, so reveal it. */
    function sweep() {
      if (!pending.length) return;
      var left = [];
      for (var i = 0; i < pending.length; i++) {
        if (pending[i].getBoundingClientRect().top < 1) reveal(pending[i]);
        else left.push(pending[i]);
      }
      pending = left;
    }

    var queued = false;
    function onScroll() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () {
        queued = false;
        sweep();
      });
    }

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            reveal(en.target);
            io.unobserve(en.target);
          }
        });
      }, { rootMargin: '0px 0px -6% 0px', threshold: 0.05 });
      Array.prototype.forEach.call(els, function (el) { io.observe(el); });
    } else {
      /* without an observer the opacity:0 rule would never be lifted at all */
      Array.prototype.forEach.call(els, reveal);
      pending = [];
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    window.addEventListener('pageshow', onScroll);
    /* the browser can restore a scroll position before this script runs */
    setTimeout(sweep, 300);
    setTimeout(sweep, 1200);
  }
  wireScrollFades();

  /* Table of contents: mark the section the reader is actually in, so the hero
     index reports position instead of only offering destinations. */
  function wireTocSpy() {
    var links = Array.prototype.slice.call(document.querySelectorAll('.toc-list a[href^="#"]'));
    if (!links.length) return;
    var map = links.map(function (a) {
      return { a: a, el: document.querySelector(a.getAttribute('href')) };
    }).filter(function (m) { return m.el; });
    if (!map.length) return;

    var ticking = false;
    function update() {
      ticking = false;
      var line = window.innerHeight * 0.35;
      var current = null;
      for (var i = 0; i < map.length; i++) {
        if (map[i].el.getBoundingClientRect().top <= line) current = map[i];
      }
      for (var j = 0; j < map.length; j++) {
        var on = map[j] === current;
        map[j].a.classList.toggle('is-current', on);
        if (on) map[j].a.setAttribute('aria-current', 'true');
        else map[j].a.removeAttribute('aria-current');
      }
    }
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();
  }
  wireTocSpy();

  /* Reading progress: a single hairline at the top edge of the screen. It only
     shows itself once the page is long enough to be worth measuring. */
  function wireReadProgress() {
    var bar = document.createElement('div');
    bar.className = 'read-progress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);

    var ticking = false;
    function update() {
      ticking = false;
      var de = document.documentElement;
      var max = de.scrollHeight - window.innerHeight;
      if (max < window.innerHeight * 0.6) {
        bar.classList.remove('is-live');
        return;
      }
      bar.classList.add('is-live');
      var p = Math.min(1, Math.max(0, window.scrollY / max));
      bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    }
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    window.addEventListener('pageshow', onScroll);
    update();
  }
  wireReadProgress();

  /* Motion gate for the intro fade (also used by the wizard — exposed on
     window so other scripts can share the same preference check). */
  function motionOK() {
    return !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  window.motionOK = motionOK;

  /* Stream the opening sentence, then reveal the article in one quick fade. */
  function fadeIntro() {
    if (document.documentElement.classList.contains('wiz-app') || document.body.classList.contains('wiz-app')) return;
    var lead = document.querySelector('[data-typewrite]');
    if (!lead || !motionOK()) return;
    var copy = lead.querySelector('.intro-copy');
    var typed = lead.querySelector('.intro-stream');
    if (!copy || !typed) return;
    var text = copy.textContent;
    var restEls = Array.prototype.slice.call(document.querySelectorAll(lead.getAttribute('data-typewrite-then') || '[data-intro-rest]'));
    lead.classList.add('tw-typing');
    restEls.forEach(function (el, index) {
      el.style.setProperty('--intro-delay', Math.min(index * 40, 160) + 'ms');
      el.classList.add('tw-rest');
    });
    var frame = 0;
    var started = null;
    var finished = false;
    var preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    function finish() {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(frame);
      lead.classList.remove('tw-typing');
      typed.textContent = '';
      restEls.forEach(function (el) { el.classList.add('is-in', 'tw-in'); });
      window.removeEventListener('wheel', finish);
      window.removeEventListener('touchmove', finish);
      window.removeEventListener('keydown', onKey);
      preference.removeEventListener('change', finish);
      setTimeout(function () {
        restEls.forEach(function (el) {
          el.classList.remove('tw-rest', 'tw-in');
          el.style.removeProperty('--intro-delay');
        });
      }, 660);
    }
    function onKey(event) {
      if (['PageDown', 'PageUp', 'Home', 'End', 'ArrowDown', 'ArrowUp', 'Tab'].includes(event.key)) finish();
    }
    function type(now) {
      if (started === null) started = now;
      var progress = Math.min(1, (now - started) / 300);
      typed.textContent = text.slice(0, Math.floor(progress * text.length));
      if (progress === 1) finish();
      else frame = requestAnimationFrame(type);
    }
    /* Only user navigation skips typing. Browser scroll/focus restoration on
       refresh and tab visibility changes must not silently cancel it. */
    window.addEventListener('wheel', finish, { passive: true });
    window.addEventListener('touchmove', finish, { passive: true });
    window.addEventListener('keydown', onKey);
    preference.addEventListener('change', finish);
    frame = requestAnimationFrame(type);
  }
  fadeIntro();

  /* A tiny landing beat on button presses across all pages. */
  document.addEventListener('click', function (event) {
    var button = event.target.closest('.btn');
    if (!button || !motionOK()) return;
    button.classList.remove('fun-tap');
    void button.offsetWidth;
    button.classList.add('fun-tap');
    setTimeout(function () { button.classList.remove('fun-tap'); }, 350);
  });
})();
