/* ==========================================================================
   Drivee — ticket scanner + lawyer funnel
   The whole point of the landing page: a driver arrives from a Google
   search, drops their ticket in, and gets a verdict plus a defence firm
   without ever leaving the page.

     drop/paste/photo → shrink → /api/claude (vision) → parse
       → ticket details + verdict + deadline cost
       → matched firms → firm detail → free case review → /api/lead

   Vision prompt and parser are carried over from the old app so the
   extraction behaves exactly as it does in production.
   ========================================================================== */
(function () {
  'use strict';

  var $  = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  var zone   = $('#dropzone');
  var input  = $('#ticket-file');
  var stage  = $('#scan-stage');
  if (!zone || !input || !stage) return;

  var intake = zone.closest('.intake');
  var dzTitle = $('.dz-title', zone);
  var dzTitleFull = dzTitle ? dzTitle.textContent : '';

  var state = { parsed: null, firm: null, busy: false };

  /* Collapse the big dropzone once an answer is on screen, restore it when
     the user comes back to scan another. */
  function setCompact(on) {
    if (!intake) return;
    intake.classList.toggle('has-result', !!on);
    if (dzTitle) dzTitle.textContent = on ? 'Scan another ticket' : dzTitleFull;
    zone.setAttribute('aria-label', on
      ? 'Scan another ticket'
      : 'Upload a photo of your ticket to scan it');
  }

  /* ── analytics (same endpoint the old site used) ──────────────── */
  function track(event, detail) {
    try {
      fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: event, detail: detail || '', path: location.pathname }),
        keepalive: true
      }).catch(function () {});
    } catch (e) {}
  }

  /* ── image shrink — keeps us under Vercel's body limit (HTTP 413) ── */
  function shrink(file, maxPx, quality, done) {
    try {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        try {
          var w = img.naturalWidth, h = img.naturalHeight;
          var scale = Math.min(1, maxPx / Math.max(w, h));
          var c = document.createElement('canvas');
          c.width  = Math.round(w * scale);
          c.height = Math.round(h * scale);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          URL.revokeObjectURL(url);
          done(c.toDataURL('image/jpeg', quality));
        } catch (e) { URL.revokeObjectURL(url); done(null); }
      };
      img.onerror = function () { URL.revokeObjectURL(url); done(null); };
      img.src = url;
    } catch (e) { done(null); }
  }

  var VISION_PROMPT =
    'You are scanning a document that may be any Canadian vehicle-related fine, ticket, or bill. ' +
    'This includes: parking tickets, speeding tickets, red light camera fines, stop sign fines, stunt driving charges, ' +
    'careless driving charges, DUI/impaired driving charges, toll bills (407 ETR, 412, 418), HOV lane violations, ' +
    'distracted driving fines, seatbelt fines, insurance fines, registration fines, camera enforcement notices, ' +
    'or any other traffic or parking violation from any Canadian province or territory ' +
    '(ON, BC, QC, AB, MB, SK, NS, NB, PE, NL, YT, NT, NU).\n\n' +
    'Extract all available details and reply in this EXACT format (no extra text):\n' +
    'AMOUNT: [total amount owing, number only, no $ sign]\n' +
    'REF: [ticket number, infraction number, reference number, or account number]\n' +
    'PLATE: [vehicle license plate number, or unknown]\n' +
    'TYPE: [one of: parking, speeding, redlight, stopsign, toll, hov, distracted, seatbelt, stunt, careless, dui, insurance, registration, camera, other]\n' +
    'PROVINCE: [2-letter province code where violation occurred, e.g. ON, BC, QC, or unknown]\n' +
    'MUNICIPALITY: [city or municipality where violation occurred, e.g. Toronto, Mississauga, Ottawa, Vancouver, Montreal, or unknown]\n' +
    'DATE: [violation or bill date YYYY-MM-DD, or unknown]\n' +
    'DUE: [payment due date YYYY-MM-DD, or unknown]\n' +
    'ADVICE: [1 clear practical sentence: dispute chances and what to do next]\n\n' +
    'If the image contains NO fine, ticket, or bill of any kind, reply exactly: NOT_A_TICKET';

  function parseReply(text) {
    function grab(rx) { var m = text.match(rx); return m ? m[1].trim() : null; }
    var clean = function (v) { return (v && v.toLowerCase() !== 'unknown') ? v : null; };
    return {
      amount:       grab(/AMOUNT:\s*([\d.]+)/i),
      ref:          clean(grab(/REF:\s*([^\n]+)/i)),
      plate:        clean(grab(/PLATE:\s*([^\n]+)/i)),
      type:         (grab(/TYPE:\s*(\w+)/i) || '').toLowerCase() || null,
      province:     clean((grab(/PROVINCE:\s*([^\n]+)/i) || '').toUpperCase()),
      municipality: clean(grab(/MUNICIPALITY:\s*([^\n]+)/i)),
      date:         clean(grab(/DATE:\s*([^\n]+)/i)),
      due:          clean(grab(/DUE:\s*([^\n]+)/i)),
      advice:       grab(/ADVICE:\s*([^\n]+)/i)
    };
  }

  /* ── violation labels + demerit points (carried over) ─────────── */
  var TYPE_LABELS = {
    parking:      ['Parking violation', 0],
    meter:        ['Expired meter', 0],
    toll:         ['Toll bill', 0],
    speeding:     ['Speeding', 3],
    stunt:        ['Stunt driving (50+ km/h over)', 6],
    redlight:     ['Red light', 3],
    camera:       ['Camera enforcement', 0],
    stopsign:     ['Fail to stop (stop sign)', 3],
    distracted:   ['Distracted / handheld device', 3],
    careless:     ['Careless driving', 6],
    seatbelt:     ['Seatbelt violation', 2],
    hov:          ['HOV lane violation', 3],
    insurance:    ['No insurance', 0],
    registration: ['Registration offence', 0],
    dui:          ['DUI / impaired', 0],
    other:        ['Traffic violation', 0]
  };

  /* ── verdict bands — the old app's four-way classification ────── */
  var SERIOUS = ['dui', 'stunt', 'careless'];
  var FIGHTY  = ['speeding', 'redlight', 'stopsign', 'distracted', 'hov', 'camera'];

  function verdictFor(p) {
    var amt = parseFloat(p.amount || '0') || 0;
    var t   = p.type || 'other';
    var overdue = p.due ? (new Date(p.due) < new Date()) : false;

    if (overdue) return {
      key: 'urgent', label: 'Act now', tone: 'red',
      head: 'Past due — court referral risk',
      why: 'The due date on this ticket has passed. Late fees compound and an unpaid fine can block your plate renewal. Talk to a paralegal before it escalates.'
    };
    if (SERIOUS.indexOf(t) !== -1) return {
      key: 'serious', label: 'Get representation', tone: 'red',
      head: 'Worth fighting — with a professional',
      why: 'This charge carries demerit points, insurance consequences, and in some cases a criminal record. Self-representing is rarely the cheaper option here.'
    };
    if (FIGHTY.indexOf(t) !== -1) return {
      key: 'contest', label: 'Contest it', tone: 'amber',
      head: 'Good odds — worth disputing',
      why: 'Charges like this are regularly reduced or withdrawn at Early Resolution, especially where signage, calibration, or officer availability can be challenged.'
    };
    if (t === 'parking' && amt > 0 && amt < 60) return {
      key: 'minor', label: 'Probably just pay', tone: 'green',
      head: 'Small fine — paying is likely cheaper than your time',
      why: 'Under $60 with no demerit points. Disputing costs you a morning; pay it unless the sign was genuinely obstructed or missing.'
    };
    return {
      key: 'contest', label: 'Contest it', tone: 'amber',
      head: 'Worth a second look before you pay',
      why: 'There is a reasonable dispute path here. A free case review costs nothing and tells you whether it is worth filing.'
    };
  }

  /* ── Toronto late-fee ladder (from the published fee schedule) ── */
  function lateFees(p) {
    if (p.type !== 'parking') return null;
    var base = parseFloat(p.amount || '0') || 0;
    if (!base) return null;
    return [
      { when: 'Day 1–15',  add: 0,     total: base,                 note: 'Pay now — no extra charge' },
      { when: 'Day 16',    add: 15.39, total: base + 15.39,         note: 'Address search fee' },
      { when: 'Day 31',    add: 32.10, total: base + 47.49,         note: 'Late payment fee' },
      { when: 'Day 60',    add: 32.10, total: base + 79.59,         note: 'Plate denial — renewal blocked' }
    ];
  }

  /* ── UI states ────────────────────────────────────────────────── */
  function show(html) { stage.innerHTML = html; stage.hidden = false; }

  function showLoading() {
    show(
      '<div class="scan-card card card-pad">' +
        '<div class="scan-steps">' +
          '<div class="scan-step on"><span class="scan-step-n">01</span><span>Reading the image</span></div>' +
          '<div class="scan-step"><span class="scan-step-n">02</span><span>Extracting charge &amp; deadline</span></div>' +
          '<div class="scan-step"><span class="scan-step-n">03</span><span>Building your verdict</span></div>' +
        '</div>' +
        '<div class="scan-bar"><i></i></div>' +
        '<p class="scan-hint mono">Usually under 8 seconds</p>' +
      '</div>'
    );
    var steps = stage.querySelectorAll('.scan-step'), i = 0;
    var tick = setInterval(function () {
      i++; if (i >= steps.length) { clearInterval(tick); return; }
      steps[i].classList.add('on');
    }, 2200);
    stage._tick = tick;
  }

  function showError(msg) {
    if (stage._tick) clearInterval(stage._tick);
    show(
      '<div class="scan-card card card-pad scan-err">' +
        '<div class="scan-err-ic">!</div>' +
        '<h3>' + esc(msg) + '</h3>' +
        '<p class="lede">Try a straight-on photo in good light with all four corners of the ticket visible.</p>' +
        '<button class="btn btn-ghost mt-16" type="button" data-retry>Try another photo</button>' +
      '</div>'
    );
    $('[data-retry]', stage).addEventListener('click', function () {
      stage.hidden = true; input.value = '';
      setCompact(false);
      zone.scrollIntoView({ block: 'center' });
    });
    track('scan_error', msg);
  }

  /* ── the verdict screen ───────────────────────────────────────── */
  function renderVerdict(p) {
    if (stage._tick) clearInterval(stage._tick);
    state.parsed = p;
    setCompact(true);

    var info  = TYPE_LABELS[p.type] || [p.type ? p.type.replace(/_/g, ' ') : 'Violation', 0];
    var v     = verdictFor(p);
    var fees  = lateFees(p);
    var firms = window.driveeMatchFirms(p.type);

    function row(label, value) {
      if (!value) return '';
      return '<div class="td-row"><span class="td-l">' + label + '</span>' +
             '<span class="td-v mono">' + esc(value) + '</span></div>';
    }

    var feeHtml = '';
    if (fees) {
      feeHtml =
        '<div class="fee-block">' +
          '<h4 class="block-h">The cost of waiting</h4>' +
          '<div class="fee-rows">' +
            fees.map(function (f, i) {
              return '<div class="fee-row' + (i === 0 ? ' now' : '') + '">' +
                '<span class="fee-when mono">' + f.when + '</span>' +
                '<span class="fee-note">' + f.note + '</span>' +
                '<span class="fee-total mono">$' + f.total.toFixed(2) + '</span>' +
              '</div>';
            }).join('') +
          '</div>' +
        '</div>';
    }

    show(
      '<div class="verdict card" data-tone="' + v.tone + '">' +
        '<div class="verdict-head">' +
          '<span class="pill pill-live"><span class="dot dot-pulse"></span>Scan complete</span>' +
          (p.ref ? '<span class="mono verdict-ref">' + esc(p.ref) + '</span>' : '') +
        '</div>' +

        '<div class="verdict-body">' +
          '<div class="verdict-badge">' + esc(v.label) + '</div>' +
          '<h3 class="verdict-h">' + esc(v.head) + '</h3>' +
          '<p class="lede">' + esc(p.advice || v.why) + '</p>' +

          '<div class="td-grid mt-24">' +
            row('Violation', info[0]) +
            row('Amount', p.amount ? '$' + p.amount : null) +
            row('Plate', p.plate) +
            row('Issued', p.date) +
            row('Due', p.due) +
            row('Where', p.municipality) +
            (info[1] > 0 ? row('Demerit points', info[1] + ' pts') : '') +
          '</div>' +

          feeHtml +

          '<div class="cta-band">' +
            '<div>' +
              '<h4 class="block-h">' + firms.length + ' vetted firms handle this charge</h4>' +
              '<p class="cta-sub">Free case review. No commission, no upsells — we pass your ticket to the firm you pick and nobody else.</p>' +
            '</div>' +
            '<button class="btn btn-amber btn-lg" type="button" data-firms>See my options →</button>' +
          '</div>' +
        '</div>' +
      '</div>'
    );

    $('[data-firms]', stage).addEventListener('click', function () { renderFirms(firms); });
    track('scan_verdict', v.key + ':' + (p.type || '?'));
  }

  /* ── matched firms ────────────────────────────────────────────── */
  function renderFirms(firms) {
    show(
      '<div class="card card-pad">' +
        '<button class="lv-back" type="button" data-back>‹ Back to verdict</button>' +
        '<div class="eyebrow eyebrow-amber mt-16">Matched for your ticket</div>' +
        '<h3 class="mt-16">Pick a paralegal — free case review</h3>' +
        '<div class="firm-list mt-24">' +
          firms.map(function (f, i) {
            return '<button class="firm" type="button" data-firm="' + i + '">' +
              '<div class="firm-top">' +
                '<span class="firm-name">' + esc(f.name) + '</span>' +
                '<span class="firm-from mono">from $' + f.from + '</span>' +
                '<span class="firm-arrow">›</span>' +
              '</div>' +
              '<div class="firm-claim">' + esc(f.claim) + '</div>' +
              '<div class="firm-perks">' +
                f.perks.slice(0, 3).map(function (p) {
                  return '<span class="firm-perk">' + esc(p) + '</span>';
                }).join('') +
              '</div>' +
            '</button>';
          }).join('') +
        '</div>' +
        '<p class="trust">🔒 Free consultation. We forward your details to the firm you choose — never to anyone else.</p>' +
      '</div>'
    );

    $('[data-back]', stage).addEventListener('click', function () { renderVerdict(state.parsed); });
    stage.querySelectorAll('[data-firm]').forEach(function (el) {
      el.addEventListener('click', function () {
        renderFirmDetail(firms, +el.getAttribute('data-firm'));
      });
    });
    track('firms_shown', String(firms.length));
  }

  function renderFirmDetail(firms, idx) {
    var f = firms[idx];
    if (!f) return;
    show(
      '<div class="card card-pad">' +
        '<button class="lv-back" type="button" data-back>‹ Back to firms</button>' +
        '<div class="eyebrow eyebrow-amber mt-16">Free case review · Drivee partner</div>' +
        '<h3 class="mt-16">' + esc(f.name) + '</h3>' +
        '<div class="firm-est">✓ ' + esc(f.foundedLabel) + '</div>' +
        '<blockquote class="firm-quote">' + esc(f.claim) + '</blockquote>' +
        '<div class="fact-grid">' +
          '<div class="fact"><span class="fact-l">Team</span><span class="fact-v">' + esc(f.team) + '</span></div>' +
          '<div class="fact"><span class="fact-l">Service area</span><span class="fact-v">' + esc(f.area) + '</span></div>' +
          '<div class="fact"><span class="fact-l">Pricing</span><span class="fact-v">from $' + f.from + '</span></div>' +
        '</div>' +
        '<a class="reviews-link" target="_blank" rel="noopener nofollow" ' +
          'href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(f.name + ' Toronto') + '">' +
          '<span class="reviews-star">★</span>' +
          '<span><b>Read real Google reviews</b><br><small>Opens Google Maps — fresh and unfiltered</small></span>' +
          '<span class="reviews-arrow">↗</span>' +
        '</a>' +
        '<button class="btn btn-amber btn-lg btn-block mt-24" type="button" data-pick>' +
          'Continue → free case review' +
        '</button>' +
        '<p class="trust">Quoted lines are the firm\'s own public claims, not Drivee\'s assessment. ' +
        'We forward your info to this firm only.</p>' +
      '</div>'
    );
    $('[data-back]', stage).addEventListener('click', function () { renderFirms(firms); });
    $('[data-pick]', stage).addEventListener('click', function () { renderLeadForm(firms, idx); });
    track('firm_opened', f.id);
  }

  /* ── lead form ────────────────────────────────────────────────── */
  function ticketSummary(p) {
    var s = [];
    if (p.amount) s.push('Fine: $' + p.amount);
    if (p.ref)    s.push('Ref: ' + p.ref);
    if (p.plate)  s.push('Plate: ' + p.plate);
    if (p.type)   s.push('Type: ' + String(p.type).replace(/_/g, ' '));
    if (p.due)    s.push('Due: ' + p.due);
    if (p.municipality) s.push('Where: ' + p.municipality);
    return s.join(' · ') || 'Ticket scanned (details to follow)';
  }

  function renderLeadForm(firms, idx) {
    var f = firms[idx];
    var p = state.parsed || {};
    state.firm = f;

    show(
      '<div class="card card-pad">' +
        '<button class="lv-back" type="button" data-back>‹ Back</button>' +
        '<div class="eyebrow eyebrow-amber mt-16">Free case review</div>' +
        '<h3 class="mt-16">with ' + esc(f.name) + '</h3>' +
        '<div class="lead-summary mono">' + esc(ticketSummary(p)) + '</div>' +
        '<form class="lead-form" novalidate>' +
          '<label class="fld"><span>Your name</span>' +
            '<input name="name" autocomplete="name" required placeholder="Alex Chen"></label>' +
          '<label class="fld"><span>Email</span>' +
            '<input name="email" type="email" autocomplete="email" required placeholder="you@example.com"></label>' +
          '<label class="fld"><span>Phone <em>(optional)</em></span>' +
            '<input name="phone" type="tel" autocomplete="tel" placeholder="416 555 0134"></label>' +
          '<label class="fld"><span>Anything they should know? <em>(optional)</em></span>' +
            '<textarea name="note" rows="3" placeholder="The sign was hidden behind construction hoarding."></textarea></label>' +
          '<input type="text" name="company" class="sr-only" tabindex="-1" autocomplete="off" aria-hidden="true">' +
          '<button class="btn btn-amber btn-lg btn-block" type="submit">Request my free review</button>' +
          '<p class="lead-err" hidden></p>' +
          '<p class="trust">By sending this you agree we may pass your ticket details to ' + esc(f.name) +
          '. Drivee is not a law firm and takes no commission.</p>' +
        '</form>' +
      '</div>'
    );

    $('[data-back]', stage).addEventListener('click', function () { renderFirmDetail(firms, idx); });
    $('.lead-form', stage).addEventListener('submit', function (e) {
      e.preventDefault();
      submitLead(e.target, f, p);
    });
    track('lead_form', f.id);
  }

  function submitLead(form, firm, p) {
    if (state.busy) return;
    var err  = $('.lead-err', form);
    var btn  = form.querySelector('button[type=submit]');
    var data = {
      name:  form.name.value.trim(),
      email: form.email.value.trim(),
      phone: form.phone.value.trim(),
      note:  form.note.value.trim(),
      company: form.company.value,          // honeypot
      firmName:  firm.name,
      firmEmail: firm.email,
      ticket: ticketSummary(p)
    };

    if (!data.name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email)) {
      err.hidden = false;
      err.textContent = 'Please enter your name and a valid email.';
      return;
    }

    state.busy = true;
    btn.disabled = true;
    btn.textContent = 'Sending…';
    err.hidden = true;

    fetch('/api/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    .then(function (r) { return r.json().catch(function () { return { ok: r.ok }; }); })
    .then(function (res) {
      state.busy = false;
      if (!res || !res.ok) throw new Error((res && res.error) || 'Send failed');
      renderThanks(firm);
      track('lead_sent', firm.id);
    })
    .catch(function (e) {
      state.busy = false;
      btn.disabled = false;
      btn.textContent = 'Request my free review';
      err.hidden = false;
      err.innerHTML = esc(e.message || 'Could not send') +
        ' — you can email them directly at <a href="mailto:' + esc(firm.email) + '">' + esc(firm.email) + '</a>.';
    });
  }

  function renderThanks(firm) {
    show(
      '<div class="card card-pad center scan-done">' +
        '<div class="done-ic">✓</div>' +
        '<h3>Sent to ' + esc(firm.name) + '</h3>' +
        '<p class="lede mt-16">They typically reply within one business day. We copied you on the email so you have a record of exactly what was shared.</p>' +
        '<div class="done-next mt-32">' +
          '<a class="btn btn-ghost" href="/app.html">Track this ticket in the app</a>' +
          '<a class="btn btn-ghost" href="/blog/how-to-dispute-parking-ticket-toronto.html">How disputes work →</a>' +
        '</div>' +
      '</div>'
    );
  }

  /* ── intake ───────────────────────────────────────────────────── */
  function handleFile(file) {
    if (!file) return;
    if (!/^image\//.test(file.type) && !/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name || '')) {
      showError('That is not an image — upload a photo of your ticket');
      return;
    }
    stage.scrollIntoView({ behavior: 'smooth', block: 'center' });
    showLoading();
    track('scan_start', file.type || 'image');

    shrink(file, 1800, 0.85, function (dataUrl) {
      if (dataUrl) return send(dataUrl, 'image/jpeg');
      // HEIC the browser cannot decode — send the original bytes and hope
      var r = new FileReader();
      r.onerror = function () { showError('Could not read the photo — try selecting it again'); };
      r.onload  = function (ev) {
        var t = file.type;
        if (['image/jpeg', 'image/png', 'image/gif', 'image/webp'].indexOf(t) === -1) t = 'image/jpeg';
        send(ev.target.result, t);
      };
      r.readAsDataURL(file);
    });
  }

  function send(dataUrl, mediaType) {
    var base64 = dataUrl.split(',')[1];
    var ctrl = (typeof AbortController === 'function') ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 45000) : null;

    fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: ctrl ? ctrl.signal : undefined,
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
            { type: 'text', text: VISION_PROMPT }
          ]
        }]
      })
    })
    .then(function (r) {
      if (timer) clearTimeout(timer);
      if (!r.ok) throw new Error('Server error (' + r.status + ')');
      return r.json();
    })
    .then(function (data) {
      if (data.error) throw new Error(data.error.message || 'Scan failed');
      var text = (data.content && data.content[0] && data.content[0].text || '').trim();
      if (!text || text.indexOf('NOT_A_TICKET') !== -1) {
        showError('No ticket detected — try a clearer photo');
        return;
      }
      renderVerdict(parseReply(text));
    })
    .catch(function (e) {
      if (timer) clearTimeout(timer);
      showError(e && e.name === 'AbortError'
        ? 'Scan timed out — try again with a smaller photo'
        : (e.message || 'Could not reach Drivee — check your connection'));
    });
  }

  /* ── dropzone wiring ──────────────────────────────────────────── */
  zone.addEventListener('click', function () { input.click(); });
  zone.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); }
  });
  input.addEventListener('change', function () { handleFile(input.files[0]); });

  ['dragenter', 'dragover'].forEach(function (ev) {
    zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.add('over'); });
  });
  ['dragleave', 'drop'].forEach(function (ev) {
    zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.remove('over'); });
  });
  zone.addEventListener('drop', function (e) {
    var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) handleFile(f);
  });

  // paste a screenshot straight onto the page
  addEventListener('paste', function (e) {
    var items = (e.clipboardData && e.clipboardData.items) || [];
    for (var i = 0; i < items.length; i++) {
      if (items[i].type && items[i].type.indexOf('image') === 0) {
        handleFile(items[i].getAsFile());
        return;
      }
    }
  });
})();
