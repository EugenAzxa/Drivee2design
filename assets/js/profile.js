/* ==========================================================================
   Drivee — profile page (account.html)
   Signed out: email-only magic-link sign-in.
   Signed in: saved tickets (with deadline reminders), profile, cars — the
   same Supabase rows the app reads, so both stay in sync.
   ========================================================================== */
(function () {
  'use strict';

  var A = window.DriveeAccount;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };
  var me = null;

  function view(name) {
    document.querySelectorAll('.acct-view').forEach(function (el) {
      el.hidden = el.getAttribute('data-view') !== name;
    });
  }

  function track(event, detail) {
    try {
      fetch('/api/track', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: event, meta: detail || '', path: location.pathname }),
        keepalive: true
      }).catch(function () {});
    } catch (e) {}
  }

  /* Whole days from today to a YYYY-MM-DD date, compared date-to-date. */
  function daysUntil(ymd) {
    var p = String(ymd || '').split('-').map(Number);
    if (p.length !== 3 || !p[0]) return null;
    var now = new Date();
    var today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((Date.UTC(p[0], p[1] - 1, p[2]) - today) / 86400000);
  }
  function niceDate(ymd) {
    var p = String(ymd || '').split('-').map(Number);
    if (p.length !== 3 || !p[0]) return ymd || '';
    return new Date(p[0], p[1] - 1, p[2]).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  /* ── signed out ─────────────────────────────────────────────────── */
  var signin = $('.acct-signin');
  var last = A.email();
  if (last) signin.email.value = last;
  signin.addEventListener('submit', function (e) {
    e.preventDefault();
    var btn = signin.querySelector('button');
    var err = $('.lead-err', signin);
    err.hidden = true; btn.disabled = true; btn.textContent = 'Sending…';
    A.register(signin.email.value, location.origin + '/account.html').then(function () {
      $('.acct-sent', signin).hidden = false;
      btn.textContent = 'Link sent';
      track('magic_link_sent', 'profile-page');
    }).catch(function (x) {
      btn.disabled = false; btn.textContent = 'Email me a link';
      err.hidden = false; err.textContent = x.message || 'Could not send the link — try again.';
    });
  });

  /* ── signed in ──────────────────────────────────────────────────── */
  function renderTickets(rows) {
    var box = $('.acct-tickets');
    if (!rows || !rows.length) {
      box.innerHTML = '<div class="acct-empty">No saved tickets yet. Scan one and tap <b>Save to my profile</b>.</div>';
      return;
    }
    box.innerHTML = rows.map(function (r) {
      var d = daysUntil(r.due_date);
      var chip = d == null ? '' : d < 0
        ? '<span class="acct-chip late">' + (-d) + 'd overdue</span>'
        : d === 0 ? '<span class="acct-chip late">Due today</span>'
        : '<span class="acct-chip' + (d > 7 ? ' ok' : '') + '">' + d + (d === 1 ? ' day' : ' days') + ' left</span>';
      return '<div class="acct-ticket">' +
        '<div class="acct-ticket-main">' +
          '<div class="acct-ticket-ref">' + esc(r.ticket_ref || 'Ticket') + '</div>' +
          '<div class="acct-ticket-due">Respond by ' + esc(niceDate(r.due_date)) + '</div>' +
        '</div>' + chip +
        '<button class="acct-x" type="button" data-del="' + esc(r.id) + '" aria-label="Remove ticket">×</button>' +
      '</div>';
    }).join('');
    box.querySelectorAll('[data-del]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (!confirm('Remove this ticket and its reminder?')) return;
        b.disabled = true;
        A.removeTicket(me, b.getAttribute('data-del')).then(loadTickets).catch(function (x) {
          b.disabled = false; alert(x.message);
        });
      });
    });
  }
  function loadTickets() {
    return A.tickets(me).then(renderTickets).catch(function () {
      $('.acct-tickets').innerHTML = '<div class="acct-empty">Couldn’t load your tickets right now.</div>';
    });
  }

  function renderCars(rows) {
    var box = $('.acct-cars');
    if (!rows || !rows.length) {
      box.innerHTML = '<div class="acct-empty">No cars yet. Add them in the app to track plates and permits.</div>';
      return;
    }
    box.innerHTML = rows.map(function (c) {
      return '<span class="acct-car">' + esc(c.emoji || '🚗') + ' ' + esc(c.nickname || 'My car') +
        (c.plate ? ' <b>' + esc(c.plate) + '</b>' : '') + '</span>';
    }).join('');
  }

  var profileForm = $('.acct-profile');
  profileForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var err = $('.lead-err', profileForm), ok = $('.acct-saved', profileForm);
    var btn = profileForm.querySelector('button');
    err.hidden = true; ok.hidden = true; btn.disabled = true;
    var name = profileForm.name.value.trim().slice(0, 80);
    var plate = profileForm.plate.value.trim().toUpperCase().slice(0, 12);
    A.saveProfile(me, name, plate).then(function () {
      ok.hidden = false; btn.disabled = false;
      greet(name);
    }).catch(function (x) {
      btn.disabled = false; err.hidden = false; err.textContent = x.message || 'Could not save.';
    });
  });

  function greet(name) {
    var first = String(name || '').trim().split(/\s+/)[0];
    $('.acct-hello').textContent = first ? 'Hi, ' + first : 'Hi there';
    $('.acct-avatar').textContent = (first || me.email || 'D').charAt(0).toUpperCase();
  }

  $('.acct-signout').addEventListener('click', function () {
    A.signOut().then(function () { me = null; view('out'); });
  });

  /* A ticket the driver asked to save before they had signed in. */
  function savePending(u) {
    var item = null;
    try { item = JSON.parse(localStorage.getItem('drivee_pending_ticket') || 'null'); } catch (e) {}
    if (!item || !item.due) return Promise.resolve();
    return A.saveTicket(u, item.ref, item.due).then(function () {
      try { localStorage.removeItem('drivee_pending_ticket'); } catch (e) {}
      track('ticket_saved', 'after-sign-in');
    }).catch(function () {});
  }

  function showSignedIn(u) {
    me = u;
    $('.acct-email').textContent = u.email || '';
    greet('');
    view('in');
    A.profile(u).then(function (p) {
      if (p) {
        profileForm.name.value = p.full_name || '';
        profileForm.plate.value = p.license_plate || '';
        greet(p.full_name);
      }
    }).catch(function () {});
    savePending(u).then(loadTickets);
    A.cars(u).then(renderCars).catch(function () { renderCars([]); });
  }

  // force=true: always load the SDK here, so a magic link landing on this
  // page is picked up from the URL and turned into a session.
  A.user(true).then(function (u) {
    if (u) {
      showSignedIn(u);
      if (/access_token|type=magiclink/.test(location.hash)) {
        history.replaceState(null, '', location.pathname);
        track('account_signed_in', 'profile-page');
      }
    } else {
      view('out');
    }
  });
})();
