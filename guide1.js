/* guide1.js — the iOS 6 setup wizard.
 *
 * One linear sequence of 26 logical steps: toolchain setup (0–3), a branch
 * (4), the chosen path — templates (5–11) or manual (12–24) — and the finale
 * (25). The three downloads variants are a single logical step; only the one
 * matching the chosen OS is shown. Steps with data-path belong to one branch
 * only. Every actionable step carries a confirmation checkbox that gates the
 * Next button until ticked.
 *
 * No-JS visitors see the whole guide stacked (see .wiz-viewport CSS).
 */
(function () {
  const shell = document.querySelector('.wiz-viewport');
  if (!shell) return;

  const steps = Array.from(shell.querySelectorAll('.wizard-step'));

  /* DOM layout: 0 OS · 1–3 downloads variants · 4 Xcode · 5 rpath ·
   * 6 path choice · 7–13 templates · 14–26 manual · 27 finale */
  const TOTAL = 26;
  const LAST = TOTAL - 1;

  function domFor(pos, os) {
    if (pos === 0) return 0;
    if (pos === 1) return { mojave: 1, bigsur: 2, monterey: 3 }[os] ?? 1;
    return pos + 2; /* logical 2+ is shifted by the three download variants */
  }

  const PHASES = [
    { name: 'Setup',     tick: 'a', title: 'Preparing the Toolchain', span: 4  },
    { name: 'Path',      tick: 'b', title: 'Choose Your Path',        span: 1  },
    { name: 'Templates', tick: 'c', title: 'Using the Templates',     span: 7  },
    { name: 'Manual',    tick: 'd', title: 'Manual Project Setup',    span: 13 },
    { name: 'Build',     tick: 'e', title: "You're All Set",          span: 1  }
  ];
  function phaseFor(pos) {
    return pos < 4 ? 0 : pos === 4 ? 1 : pos < 12 ? 2 : pos < LAST ? 3 : 4;
  }

  const kickerTick = document.querySelector('#wizard .section-head .tick');
  const kicker     = document.getElementById('wiz-kicker');
  const title      = document.getElementById('wiz-title');
  const back       = document.getElementById('wiz-back');
  const next       = document.getElementById('wiz-next');
  const restart    = document.getElementById('wiz-restart');
  const progress   = document.getElementById('wiz-progress');
  const announcer  = document.getElementById('wiz-announcer');

  const state = { pos: 0, os: null, path: null };

  /* ── visibility ─────────────────────────────────────────────── */

  /* These keep the *selection cards* and the per-OS variant paragraphs in
   * sync. The step blocks themselves are clamped in show() — the two must
   * not fight over the same is-hidden class. */
  function applyOS() {
    shell.querySelectorAll('.os-opt').forEach((el) => {
      el.classList.toggle('is-hidden', el.dataset.os !== state.os);
    });
    shell.querySelectorAll('.os-card').forEach((card) => {
      card.classList.toggle('is-selected', card.querySelector('input').checked);
    });
  }

  function applyPath() {
    shell.querySelectorAll('.path-card').forEach((card) => {
      card.classList.toggle('is-selected', card.querySelector('input').checked);
    });
  }

  /* ── gating ─────────────────────────────────────────────────── */

  /* A step is blocked until its own requirement is satisfied:
   *   step 0  — an OS chosen
   *   step 4  — a path chosen
   *   others  — its confirmation checkbox ticked */
  function blocked(pos) {
    if (pos === 0) return !state.os;
    if (pos === 4) return !state.path;
    const el = steps[domFor(pos, state.os)];
    const box = el && el.querySelector('.confirm-box');
    return !!(box && !box.checked);
  }

  /* The branch: the other path's steps are skipped entirely, so the last
   * step of the chosen path lands on the finale — and Back from the finale
   * returns to the last step of the chosen path. */
  function advance(from) {
    if (from === 4) return state.path === 'manual' ? 12 : 5;
    if (from === 11 || from === 24) return 25;
    return from + 1;
  }

  function retreat(from) {
    if (from === 5 || from === 12) return 4;
    if (from === 25) return state.path === 'manual' ? 24 : 11;
    return from - 1;
  }

  function refreshControls() {
    const pos = state.pos;
    back.disabled = pos === 0;
    next.hidden = pos === LAST;
    restart.hidden = pos !== LAST;
    next.disabled = pos !== LAST && blocked(pos);

    const p = phaseFor(pos);
    if (kickerTick) kickerTick.textContent = PHASES[p].tick;
    kicker.textContent = PHASES[p].name;
    title.textContent = PHASES[p].title;

    if (pos === 4) {
      progress.textContent = 'Choose your path';
    } else if (pos === LAST) {
      progress.textContent = 'Setup complete';
    } else {
      const start = p === 0 ? 0 : p === 2 ? 5 : 12;
      progress.textContent = PHASES[p].name + ' · ' + (pos - start + 1) + ' of ' + PHASES[p].span;
    }
  }

  /* ── navigation ─────────────────────────────────────────────── */

  function revealStep(el) {
    const motionOK = window.motionOK && window.motionOK();
    if (!motionOK || !el) return;
    el.classList.remove('wiz-enter', 'wiz-shown');
    void el.offsetWidth;               /* reflow so the transition restarts */
    el.classList.add('wiz-enter', 'wiz-shown');
  }

  function show(pos, announce) {
    state.pos = Math.max(0, Math.min(pos, LAST));
    const i = domFor(state.pos, state.os);
    applyOS();
    applyPath();
    steps.forEach((el, k) => {
      /* variant steps stay hidden until their OS / the chosen path is shown */
      const osBlocked  = el.dataset.os   && el.dataset.os   !== state.os;
      const pathBlocked = el.dataset.path && el.dataset.path !== state.path;
      /* !! coerces to a real boolean — force === undefined would *toggle*,
       * and an absent class toggled on stays on */
      el.classList.toggle('is-hidden', !!(k !== i || osBlocked || pathBlocked));
    });
    revealStep(steps[i]);
    refreshControls();
    if (announce) {
      const h3 = steps[i].querySelector('h3');
      announcer.textContent = 'Step ' + (state.pos + 1) + ' of ' + TOTAL + ': ' +
        (h3 ? h3.textContent : '');
    }
  }

  /* ── wiring ─────────────────────────────────────────────────── */

  next.addEventListener('click', () => {
    if (blocked(state.pos)) return;
    show(advance(state.pos), true);
  });

  back.addEventListener('click', () => show(retreat(state.pos), true));

  restart.addEventListener('click', () => {
    shell.querySelectorAll('.confirm-box').forEach((box) => (box.checked = false));
    shell.querySelectorAll('input[name="wizard-path"]').forEach((r) => (r.checked = false));
    state.path = null;
    applyPath();
    show(0, true);
  });

  shell.addEventListener('change', (e) => {
    const t = e.target;
    if (t.name === 'wizard-os') {
      state.os = t.value;
    } else if (t.name === 'wizard-path') {
      state.path = t.value;
    } else if (t.classList.contains('confirm-box')) {
      /* the current step's gate just changed */
    } else {
      return;
    }
    applyOS();
    applyPath();
    refreshControls();
  });

  /* ── first paint ────────────────────────────────────────────── */

  show(0, false);
})();
