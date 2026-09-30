/* ==========================================================================
   Drivee — install to home screen
   Drivee is a PWA, not a store app, so these badges do the thing store badges
   promise rather than linking somewhere that does not exist:

     Android / Chrome / Edge  → the real beforeinstallprompt flow
     iOS Safari               → the Share → Add to Home Screen sheet, because
                                Apple allows install only from Safari
     already installed        → the badges hide themselves
     anything else            → a short honest explainer

   If Drivee ever ships a real App Store / Play listing, swap the click
   handlers for the store URLs and delete the rest of this file.
   ========================================================================== */
(function () {
  'use strict';

  var row = document.getElementById('install-row');
  if (!row) return;

  var btnPrimary = row.querySelector('[data-install="primary"]');
  var btnIos     = row.querySelector('[data-install="ios"]');
  var deferred   = null;

  var ua       = navigator.userAgent || '';
  var isIOS    = /iPhone|iPad|iPod/i.test(ua) ||
                 (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var isSafari = /^((?!chrome|android|crios|fxios|edgios).)*safari/i.test(ua);

  function installed() {
    return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) ||
           navigator.standalone === true;
  }

  function track(event, meta) {
    try {
      fetch('/api/track', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: event, meta: meta || '', path: location.pathname }),
        keepalive: true
      }).catch(function () {});
    } catch (e) {}
  }

  /* Already running as an installed app — the invitation is noise. */
  if (installed()) { row.hidden = true; return; }

  /* Android / Chromium: hold the prompt until the user asks for it. */
  addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferred = e;
    row.classList.add('can-install');
    if (btnPrimary) btnPrimary.querySelector('.ib-sub').textContent = 'Install in one tap';
  });

  addEventListener('appinstalled', function () {
    row.hidden = true;
    track('app_open', 'pwa_installed');
  });

  /* ── the iOS sheet ─────────────────────────────────────────────── */
  function shareGlyph() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
           'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
           '<path d="M12 15V3m0 0L8 7m4-4 4 4"/>' +
           '<path d="M4 13v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6"/></svg>';
  }

  function openSheet(title, steps, note) {
    var wrap = document.createElement('div');
    wrap.className = 'install-sheet';
    wrap.innerHTML =
      '<div class="is-scrim" data-close></div>' +
      '<div class="is-panel" role="dialog" aria-modal="true" aria-label="' + title + '">' +
        '<button class="is-x" type="button" data-close aria-label="Close">×</button>' +
        '<h3 class="is-h">' + title + '</h3>' +
        '<ol class="is-steps">' +
          steps.map(function (s) { return '<li>' + s + '</li>'; }).join('') +
        '</ol>' +
        (note ? '<p class="is-note">' + note + '</p>' : '') +
        '<button class="btn btn-ghost btn-block mt-16" type="button" data-close>Got it</button>' +
      '</div>';
    document.body.appendChild(wrap);
    document.body.style.overflow = 'hidden';

    function close() {
      wrap.remove();
      document.body.style.overflow = '';
      removeEventListener('keydown', onKey);
    }
    function onKey(e) { if (e.key === 'Escape') close(); }

    wrap.addEventListener('click', function (e) {
      if (e.target.hasAttribute('data-close')) close();
    });
    addEventListener('keydown', onKey);
    requestAnimationFrame(function () { wrap.classList.add('open'); });
  }

  function iosSheet() {
    openSheet('Add Drivee to your home screen', [
      'Tap the <strong>Share</strong> button ' + shareGlyph() + ' at the bottom of Safari.',
      'Scroll down and choose <strong>Add to Home Screen</strong>.',
      'Tap <strong>Add</strong>. Drivee appears with the other apps.'
    ], isSafari
      ? 'It opens full screen and works offline — same as a store app, without the download.'
      : 'Apple only allows this from <strong>Safari</strong>, so open drivee.ca there first.');
    track('app_open', 'install_sheet_ios');
  }

  function genericSheet() {
    openSheet('Add Drivee to your home screen', [
      'Open your browser menu (⋮ or ⋯).',
      'Choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.',
      'Confirm. Drivee opens full screen, and works offline.'
    ], 'No download, no updates to approve, nothing sitting on your storage.');
    track('app_open', 'install_sheet_generic');
  }

  /* ── wiring ────────────────────────────────────────────────────── */
  if (btnPrimary) {
    btnPrimary.addEventListener('click', function () {
      if (deferred) {
        deferred.prompt();
        track('app_open', 'install_prompt_shown');
        deferred.userChoice.then(function (choice) {
          track('app_open', 'install_' + (choice && choice.outcome));
          deferred = null;
        });
        return;
      }
      if (isIOS) return iosSheet();
      genericSheet();
    });
  }

  if (btnIos) {
    btnIos.addEventListener('click', function () {
      if (isIOS) return iosSheet();
      // On a non-Apple device this button explains the iPhone route anyway —
      // people often install on a phone that is not the one they are browsing on.
      iosSheet();
    });
  }
})();
