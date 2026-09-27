/* J_W_I_ shared behaviour: sticky-masthead offset + copy buttons. */
(function () {
  'use strict';

  /* Keep body padding in sync with the (variable-height) sticky masthead. */
  var mast = document.querySelector('.masthead');
  function syncMast() {
    if (!mast) return;
    document.documentElement.style.setProperty('--mast-h', mast.offsetHeight + 'px');
  }
  if (mast) {
    syncMast();
    window.addEventListener('resize', syncMast);
    window.addEventListener('orientationchange', syncMast);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(syncMast);
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
})();
