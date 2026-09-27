/* J_W_I_ toolchain guide wizard (guide part 1): walks the reader through
   Choose macOS → Downloads → Installation → Build, one step at a time.
   Every step (and every per-OS variant) lives in the authored HTML; without
   JavaScript the whole guide simply renders as stacked sections. */
(function () {
  'use strict';

  var root = document.getElementById('wizard');
  if (!root) return;

  var steps = Array.prototype.slice.call(root.querySelectorAll('.wizard-step'));
  var back = document.getElementById('wiz-back');
  var next = document.getElementById('wiz-next');
  var finalLink = document.getElementById('wiz-final');
  var progress = document.getElementById('wiz-progress');
  var announcer = document.getElementById('wiz-announcer');
  var tick = root.querySelector('.kicker .tick');
  var kickText = document.getElementById('wiz-kicker');
  var title = document.getElementById('wiz-title');
  var osRadios = Array.prototype.slice.call(root.querySelectorAll('input[name="wizard-os"]'));

  var PHASES = [
    { tick: 'a', name: 'Downloads', title: 'Swift Toolchain Downloads', count: 2, start: 0 },
    { tick: 'b', name: 'Installation', title: 'Installing the Toolchain', count: 4, start: 2 },
    { tick: 'c', name: 'Build', title: 'How to Build', count: 6, start: 6 }
  ];

  /* Group the flat step list by data-step index (per-OS variants share an index). */
  var groups = {};
  steps.forEach(function (s) {
    var i = parseInt(s.getAttribute('data-step'), 10);
    (groups[i] = groups[i] || []).push(s);
  });
  var lastIndex = Math.max.apply(null, Object.keys(groups).map(Number));

  var state = { idx: 0, os: null };

  function motionOK() {
    return !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  /* One-way 340ms fade/slide on the incoming step — same language as .fade-io. */
  function reveal(el) {
    if (!motionOK()) return;
    el.classList.remove('wiz-enter');
    void el.offsetWidth;
    el.classList.add('wiz-enter');
    requestAnimationFrame(function () { el.classList.add('wiz-shown'); });
    setTimeout(function () { el.classList.remove('wiz-enter', 'wiz-shown'); }, 420);
  }

  function show(i) {
    state.idx = i;
    var p = PHASES[i < 2 ? 0 : i < 6 ? 1 : 2];

    var current = groups[i].filter(function (s) {
      var os = s.getAttribute('data-os');
      return !os || os === state.os;
    })[0] || groups[i][0];

    steps.forEach(function (s) {
      s.classList.toggle('is-hidden', s !== current);
    });

    /* Per-OS blocks nested inside a single step (Xcode line, rpath commands). */
    Array.prototype.forEach.call(current.querySelectorAll('[data-os]'), function (b) {
      b.classList.toggle('is-hidden', b.getAttribute('data-os') !== state.os);
    });

    tick.textContent = p.tick;
    kickText.textContent = p.name;
    title.textContent = p.title;

    var inPhase = i - p.start + 1;
    progress.textContent = p.name + ' \u00B7 ' + inPhase + ' of ' + p.count;

    var last = i === lastIndex;
    back.disabled = i === 0;
    if (next) next.hidden = last;
    if (finalLink) finalLink.hidden = !last;
    if (next && !last) next.disabled = i === 0 && !state.os;

    var h = current.querySelector('h3') || current.querySelector('p');
    if (announcer && h) {
      announcer.textContent = (last ? 'Final step: ' : 'Step ' + inPhase + ' of ' + p.count + ': ') +
        h.textContent;
    }

    reveal(current);
  }

  back.addEventListener('click', function () {
    if (state.idx > 0) show(state.idx - 1);
  });

  next.addEventListener('click', function () {
    if (!state.os && state.idx === 0) return;
    if (state.idx < lastIndex) show(state.idx + 1);
  });

  osRadios.forEach(function (r) {
    r.addEventListener('change', function () {
      state.os = r.value;
      root.querySelectorAll('.os-card').forEach(function (c) {
        c.classList.toggle('is-selected', c.querySelector('input').checked);
      });
      if (state.idx === 0) next.disabled = false;
      show(state.idx); /* re-apply per-OS blocks if the user is mid-guide */
    });
  });

  show(0);
})();
