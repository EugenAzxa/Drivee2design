/* ==========================================================================
   Drivee — store badges
   The badges are plain links to the App Store and Google Play listings; this
   only records which one was tapped, and where on the page, as an app_open.
   ========================================================================== */
(function () {
  'use strict';

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-store]');
    if (!a) return;
    try {
      fetch('/api/track', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'app_open', meta: a.getAttribute('data-store'), path: location.pathname }),
        keepalive: true
      });
    } catch (_) {}
  });
})();
