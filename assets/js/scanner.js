/* ==========================================================================
   Drivee — ticket scanner + Ontario lawyer funnel
   A driver arrives from a search, drops in a ticket photo, and gets:

     drop/paste/photo → /api/scan-ticket (server-owned prompt + JSON schema)
       → what the ticket is, in Ontario terms (screening review vs POA court)
       → what it really costs: fine + demerit points + insurance estimate
       → what representation costs for THIS charge
       → firms that can actually take it, cheapest first
       → free case review → /api/lead

   Every figure is labelled exact or estimated. Nothing here promises an
   outcome, and a Criminal Code charge is never matched to a paralegal.
   ========================================================================== */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };
  var money = function (n) {
    return '$' + Number(n || 0).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  var money0 = function (n) {
    return '$' + Math.round(Number(n || 0)).toLocaleString('en-CA');
  };

  var zone  = $('#dropzone');
  var input = $('#ticket-file');
  var stage = $('#scan-stage');
  if (!zone || !input || !stage) return;

  var ON = window.ONTARIO;

  var intake = zone.closest('.intake');
  var dzTitle = $('.dz-title', zone);
  var dzTitleFull = dzTitle ? dzTitle.textContent : '';

  var state = { ticket: null, firms: [], cost: null, busy: false };

  function setCompact(on) {
    if (!intake) return;
    intake.classList.toggle('has-result', !!on);
    if (dzTitle) dzTitle.textContent = on ? 'Scan another ticket' : dzTitleFull;
    zone.setAttribute('aria-label', on ? 'Scan another ticket' : 'Upload a photo of your ticket to scan it');
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

  /* ── image shrink, keeps us under the request body limit ───────── */
  function shrink(file, maxPx, quality, done) {
    try {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        try {
          var w = img.naturalWidth, h = img.naturalHeight;
          var scale = Math.min(1, maxPx / Math.max(w, h));
          var c = document.createElement('canvas');
          c.width = Math.round(w * scale);
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

  /* ── UI states ─────────────────────────────────────────────────── */
  function show(html) { stage.innerHTML = html; stage.hidden = false; }

  function showLoading() {
    show(
      '<div class="scan-card card card-pad">' +
        '<div class="scan-steps">' +
          '<div class="scan-step on"><span class="scan-step-n">01</span><span>Reading the image</span></div>' +
          '<div class="scan-step"><span class="scan-step-n">02</span><span>Extracting charge &amp; deadline</span></div>' +
          '<div class="scan-step"><span class="scan-step-n">03</span><span>Working out what it costs you</span></div>' +
        '</div>' +
        '<div class="scan-bar"><i></i></div>' +
        '<p class="scan-hint mono">Usually 5–15 seconds</p>' +
      '</div>'
    );
    var steps = stage.querySelectorAll('.scan-step'), i = 0;
    stage._tick = setInterval(function () {
      i++; if (i >= steps.length) { clearInterval(stage._tick); return; }
      steps[i].classList.add('on');
    }, 3500);
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
      stage.hidden = true; input.value = ''; setCompact(false);
      zone.scrollIntoView({ block: 'center' });
    });
    track('scan_error', msg);
  }

  /* Whole days from today until `ymd`. Negative means the date has passed.
     Compared date-to-date, not timestamp-to-timestamp: "2026-09-29" parses as
     midnight UTC, so a naive `new Date(due) < new Date()` calls a ticket due
     TODAY overdue from one minute past midnight onward. Telling somebody they
     have missed a deadline they still have all day to meet is the kind of
     wrong that makes them give up. */
  function daysUntil(ymd) {
    if (!ymd) return null;
    var m = String(ymd).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return null;
    var due = new Date(+m[1], +m[2] - 1, +m[3]);          // local midnight
    if (isNaN(due)) return null;
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((due - today) / 86400000);
  }

  /* ── verdict banding, now Ontario-aware ────────────────────────── */
  function verdictFor(t, o) {
    var days = daysUntil(t.due_date);
    var overdue = days !== null && days < 0;

    if (String(t.doc_type) === 'dui') return {
      key: 'criminal', label: 'Criminal charge', tone: 'red',
      head: 'This is a Criminal Code charge — get a lawyer',
      why: 'Impaired driving is prosecuted under the Criminal Code, not the Highway Traffic Act. A conviction means a criminal record. Licensed paralegals cannot represent you on this; you need a lawyer, and soon.'
    };
    if (overdue) return {
      key: 'urgent', label: 'Act now', tone: 'red',
      head: 'Past the date on this ticket',
      why: 'The response window printed on this ticket passed ' +
           (days === -1 ? 'yesterday' : Math.abs(days) + ' days ago') +
           '. Depending on the municipality that can mean added fees, a conviction registered in your absence, or a block on renewing your plate. Get advice today.'
    };
    if (days !== null && days <= 3) return {
      key: 'urgent', label: days === 0 ? 'Due today' : 'Due in ' + days + (days === 1 ? ' day' : ' days'),
      tone: 'red',
      head: days === 0 ? 'The deadline on this ticket is today' : 'You have ' + days + (days === 1 ? ' day' : ' days') + ' left',
      why: 'You have not missed it — but you are close. Whatever you decide, do it before the date printed on the ticket, because the options narrow sharply once it passes.'
    };
    if (o.worthFighting === 'strongly') return {
      key: 'serious', label: 'Get representation', tone: 'red',
      head: 'Worth fighting — with a professional',
      why: 'This charge carries ' + o.demerit + ' demerit points and a serious insurance consequence. Representation usually costs far less than the premium increase.'
    };
    if (o.worthFighting === 'usually') return {
      key: 'contest', label: 'Worth disputing', tone: 'amber',
      head: 'Good odds — worth challenging',
      why: 'Charges like this are regularly reduced or withdrawn at early resolution, and a reduction to a no-points offence protects your insurance.'
    };
    if (o.demerit === 0 && (parseFloat(t.amount) || 0) < 60) return {
      key: 'minor', label: 'Probably just pay', tone: 'green',
      head: 'Small fine, no points',
      why: 'Under $60 with no demerit points and no insurance consequence. Disputing it will cost you more in time than the ticket is worth, unless the sign was genuinely missing or obscured.'
    };
    return {
      key: 'contest', label: 'Worth a look', tone: 'amber',
      head: 'Worth a second look before you pay',
      why: 'There is a reasonable dispute path here. A free case review costs nothing and tells you whether it is worth filing.'
    };
  }

  function row(label, value) {
    if (!value && value !== 0) return '';
    return '<div class="td-row"><span class="td-l">' + label + '</span>' +
           '<span class="td-v mono">' + esc(value) + '</span></div>';
  }

  /* ── the verdict screen ────────────────────────────────────────── */
  function renderVerdict(t) {
    if (stage._tick) clearInterval(stage._tick);
    state.ticket = t;
    setCompact(true);

    var o       = ON.offence(t.doc_type);
    var v       = verdictFor(t, o);
    var regime  = ON.parkingRegime(t.municipality);
    var parking = ON.isParking(t.doc_type);
    var firms   = window.driveeMatchFirms(t.doc_type);
    var cost    = ON.costPicture({ type: t.doc_type, amount: t.amount }, firms[0] && firms[0].from);
    state.firms = firms;
    state.cost  = cost;

    /* low-confidence banner — say so rather than quietly being wrong */
    var confidenceHtml = '';
    if (t.confidence !== 'high') {
      var missing = (t.unreadable_fields || []).filter(Boolean);
      confidenceHtml =
        '<div class="conf-warn' + (t.confidence === 'low' ? ' conf-low' : '') + '">' +
          '<strong>' + (t.confidence === 'low' ? 'Low confidence read.' : 'Partial read.') + '</strong> ' +
          (missing.length
            ? 'These were not clearly legible: ' + esc(missing.join(', ')) + '. '
            : '') +
          'Check the figures below against the paper ticket before acting on them.' +
        '</div>';
    }

    /* Toronto fee ladder, or the general Ontario deadline note */
    var deadlineHtml = '';
    var ladder = (parking && regime.hasFeeLadder) ? ON.torontoFeeLadder(t.amount) : null;
    if (ladder) {
      deadlineHtml =
        '<div class="fee-block">' +
          '<h4 class="block-h">The cost of waiting <span class="tag-exact">exact</span></h4>' +
          '<div class="fee-rows">' +
            ladder.rows.map(function (f, i) {
              return '<div class="fee-row' + (i === 0 ? ' now' : '') + '">' +
                '<span class="fee-when mono">' + f.when + '</span>' +
                '<span class="fee-note">' + f.note + '</span>' +
                '<span class="fee-total mono">' + money(f.total) + '</span>' +
              '</div>';
            }).join('') +
          '</div>' +
          '<p class="src-note">' + esc(ladder.source) + '</p>' +
        '</div>';
    } else {
      deadlineHtml =
        '<div class="fee-block">' +
          '<h4 class="block-h">How this one works in ' + esc(regime.body) + '</h4>' +
          '<p class="regime-note">' + esc(parking ? regime.route : provincialRoute()) + '</p>' +
          '<p class="regime-dead">' + esc(parking ? regime.deadlineNote : PROVINCIAL_DEADLINE) + '</p>' +
        '</div>';
    }

    /* the pricing picture */
    var costHtml = renderCostBlock(cost, o, firms[0]);

    show(
      '<div class="verdict card" data-tone="' + v.tone + '">' +
        '<div class="verdict-head">' +
          '<span class="pill pill-live"><span class="dot dot-pulse"></span>Scan complete</span>' +
          (t.ticket_number ? '<span class="mono verdict-ref">' + esc(t.ticket_number) + '</span>' : '') +
        '</div>' +

        '<div class="verdict-body">' +
          confidenceHtml +
          '<div class="verdict-badge">' + esc(v.label) + '</div>' +
          '<h3 class="verdict-h">' + esc(v.head) + '</h3>' +
          '<p class="lede">' + esc(t.advice || v.why) + '</p>' +
          (t.advice ? '<p class="verdict-why">' + esc(v.why) + '</p>' : '') +

          '<div class="td-grid mt-24">' +
            row('Offence', o.label) +
            row('Amount', t.amount ? money(t.amount) : null) +
            row('Demerit points', o.demerit > 0 ? o.demerit + ' pts' : 'None') +
            row('Plate', t.plate) +
            row('Issued', t.issued_date) +
            row('Due', t.due_date) +
            row('Where', t.municipality) +
            row('Section', t.statute_section) +
          '</div>' +

          (o.note ? '<p class="offence-note">' + esc(o.note) + '</p>' : '') +

          deadlineHtml +
          costHtml +

          '<div class="cta-band">' +
            '<div>' +
              '<h4 class="block-h">' + firms.length + ' ' +
                (firms.length === 1 ? 'firm' : 'firms') + ' can take this charge</h4>' +
              '<p class="cta-sub">Free case review, no commission. We pass your ticket to the one firm you pick and nobody else.</p>' +
            '</div>' +
            '<button class="btn btn-amber btn-lg" type="button" data-firms>See who can help →</button>' +
          '</div>' +
        '</div>' +
      '</div>'
    );

    $('[data-firms]', stage).addEventListener('click', function () { renderFirms(); });
    track('scan_verdict', v.key + ':' + (t.doc_type || '?') + ':' + t.confidence);
  }

  var PROVINCIAL_DEADLINE = 'You generally have 15 days from the issue date to choose an option. ' +
    'Do nothing and the court can convict you in your absence, which puts the points on your record automatically.';

  /* ── out-of-province ───────────────────────────────────────────────
     Drivee covers Ontario. We still show what was read — that is useful
     on its own — but we do not hand out Ontario fee ladders, Ontario
     demerit points, or Ontario-licensed firms for a ticket from
     somewhere else. Saying so plainly beats quietly giving wrong advice. */
  function renderOutOfProvince(t, jurisdiction) {
    if (stage._tick) clearInterval(stage._tick);
    state.ticket = t;
    setCompact(true);

    var where = jurisdiction || t.municipality || 'outside Ontario';

    show(
      '<div class="verdict card" data-tone="amber">' +
        '<div class="verdict-head">' +
          '<span class="pill pill-live"><span class="dot dot-pulse"></span>Scan complete</span>' +
          (t.ticket_number ? '<span class="mono verdict-ref">' + esc(t.ticket_number) + '</span>' : '') +
        '</div>' +
        '<div class="verdict-body">' +
          '<div class="verdict-badge">Outside Ontario</div>' +
          '<h3 class="verdict-h">This looks like a ' + esc(where) + ' ticket</h3>' +
          '<p class="lede">Drivee only covers Ontario. The deadlines, demerit points and fee rules ' +
          'we work from are Ontario’s, and the firms we match are licensed here — so we would be ' +
          'guessing about this one, and we would rather not.</p>' +

          '<div class="td-grid mt-24">' +
            row('Where', t.jurisdiction || t.municipality) +
            row('Amount', t.amount ? money(t.amount) : null) +
            row('Ticket #', t.ticket_number) +
            row('Plate', t.plate) +
            row('Issued', t.issued_date) +
            row('Due', t.due_date) +
          '</div>' +

          '<p class="oop-note">Here is what we could read off it, in case that saves you squinting at ' +
          'the paper. For what to do next, check the instructions printed on the ticket itself — every ' +
          'jurisdiction sets its own response window, and missing it is the expensive part.</p>' +

          '<div class="cta-band">' +
            '<div>' +
              '<h4 class="block-h">Got an Ontario ticket too?</h4>' +
              '<p class="cta-sub">That one we can take all the way — verdict, real cost, and a matched firm.</p>' +
            '</div>' +
            '<button class="btn btn-ghost btn-lg" type="button" data-again>Scan another ticket</button>' +
          '</div>' +
        '</div>' +
      '</div>'
    );

    $('[data-again]', stage).addEventListener('click', function () {
      stage.hidden = true; input.value = ''; setCompact(false);
      zone.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    track('scan_verdict', 'out_of_province:' + (t.province || '?'));
  }

  function provincialRoute() {
    return 'This is a Highway Traffic Act offence, prosecuted under the Provincial Offences Act. The back of the ticket gives you three options: pay it, ask for an early resolution meeting with a prosecutor, or request a trial. Choosing an option is what stops a conviction being registered against you by default.';
  }

  /* ── the pricing block — "help them with pricing" ──────────────── */
  function renderCostBlock(cost, o, cheapest) {
    if (!cost.fine && !cost.hasInsuranceImpact) return '';

    var rows = '';
    rows += '<div class="cost-row"><span class="cost-l">The fine itself</span>' +
            '<span class="cost-v mono">' + (cost.fine ? money(cost.fine) : '—') + '</span></div>';

    if (cost.demerit > 0) {
      rows += '<div class="cost-row"><span class="cost-l">Demerit points</span>' +
              '<span class="cost-v mono">' + cost.demerit + ' pts</span></div>';
    }

    if (cost.hasInsuranceImpact) {
      rows += '<div class="cost-row"><span class="cost-l">Insurance over ' + cost.insuranceYears +
              ' yrs <span class="tag-est">estimate</span></span>' +
              '<span class="cost-v mono">' + money0(cost.insuranceLow) + '–' + money0(cost.insuranceHigh) + '</span></div>';
      rows += '<div class="cost-row cost-total"><span class="cost-l">If you just pay it</span>' +
              '<span class="cost-v mono">' + money0(cost.trueCostLow) + '–' + money0(cost.trueCostHigh) + '</span></div>';
    }

    var repLow = o.repCost ? o.repCost[0] : null;
    var repHigh = o.repCost ? o.repCost[1] : null;
    var repHtml = '';
    if (repLow) {
      repHtml =
        '<div class="cost-row cost-rep"><span class="cost-l">Typical representation ' +
          '<span class="tag-est">estimate</span></span>' +
          '<span class="cost-v mono">' + money0(repLow) + '–' + money0(repHigh) + '</span></div>' +
        (cheapest ? '<div class="cost-row"><span class="cost-l">Cheapest matched firm</span>' +
          '<span class="cost-v mono">from ' + money0(cheapest.from) + '</span></div>' : '');
    }

    var callout = '';
    if (cost.representationPaysOff) {
      callout = '<p class="cost-callout pays">On these numbers, representation costs less than the insurance increase you would otherwise absorb.</p>';
    } else if (!cost.hasInsuranceImpact && cost.fine) {
      callout = '<p class="cost-callout">No demerit points and no insurance consequence, so the only thing at stake is the fine itself.</p>';
    }

    return (
      '<div class="cost-block">' +
        '<h4 class="block-h">What it actually costs you</h4>' +
        '<div class="cost-rows">' + rows + repHtml + '</div>' +
        callout +
        '<p class="src-note">Fines and demerit points are exact. Insurance and representation figures are ' +
        'estimates for an Ontario driver and vary by insurer, record and firm — confirm at your free consultation.</p>' +
      '</div>'
    );
  }

  /* ── matched firms, with pricing ───────────────────────────────── */
  function renderFirms() {
    var firms = state.firms;
    var t = state.ticket;
    var o = ON.offence(t.doc_type);
    var needsLawyer = window.DRIVEE_CRIMINAL.indexOf(String(t.doc_type)) !== -1;

    show(
      '<div class="card card-pad">' +
        '<button class="lv-back" type="button" data-back>‹ Back to verdict</button>' +
        '<div class="eyebrow eyebrow-amber mt-16">Matched to your charge</div>' +
        '<h3 class="mt-16">' + (needsLawyer ? 'Firms with lawyers — free case review' : 'Pick a representative — free case review') + '</h3>' +
        '<p class="firms-intro">Showing firms that handle <strong>' + esc(o.label.toLowerCase()) + '</strong>' +
          (t.municipality ? ' and cover ' + esc(t.municipality) : '') + ', cheapest first.' +
          (needsLawyer ? ' Paralegals cannot represent on Criminal Code charges, so only firms with lawyers are listed.' : '') +
        '</p>' +

        (o.repCost && o.repCost[0]
          ? '<div class="price-hint">Typical cost for this charge in Ontario: <strong>' +
             money0(o.repCost[0]) + '–' + money0(o.repCost[1]) + '</strong> <span class="tag-est">estimate</span></div>'
          : '') +

        '<div class="firm-list mt-24">' +
          firms.map(function (f, i) {
            return '<button class="firm" type="button" data-firm="' + i + '">' +
              '<div class="firm-top">' +
                '<span class="firm-name">' + esc(f.name) + '</span>' +
                '<span class="firm-from mono">from ' + money0(f.from) + '</span>' +
                '<span class="firm-arrow">›</span>' +
              '</div>' +
              '<div class="firm-claim">' + esc(f.claim) + '</div>' +
              '<div class="firm-perks">' +
                '<span class="firm-perk firm-licence">' +
                  (f.licence === 'lawyers+paralegals' ? 'Lawyers + paralegals' : 'Licensed paralegals') +
                '</span>' +
                '<span class="firm-perk">' + esc(f.coverage) + '</span>' +
                f.perks.slice(0, 2).map(function (p) {
                  return '<span class="firm-perk">' + esc(p) + '</span>';
                }).join('') +
              '</div>' +
            '</button>';
          }).join('') +
        '</div>' +
        '<p class="trust">🔒 Free consultation. We forward your details to the firm you choose — never to anyone else. ' +
        'Drivee is not a law firm and takes no commission.</p>' +
      '</div>'
    );

    $('[data-back]', stage).addEventListener('click', function () { renderVerdict(state.ticket); });
    stage.querySelectorAll('[data-firm]').forEach(function (el) {
      el.addEventListener('click', function () { renderFirmDetail(+el.getAttribute('data-firm')); });
    });
    track('firms_shown', String(firms.length) + ':' + t.doc_type);
  }

  function renderFirmDetail(idx) {
    var f = state.firms[idx];
    if (!f) return;
    var o = ON.offence(state.ticket.doc_type);

    show(
      '<div class="card card-pad">' +
        '<button class="lv-back" type="button" data-back>‹ Back to firms</button>' +
        '<div class="eyebrow eyebrow-amber mt-16">Free case review · Drivee partner</div>' +
        '<h3 class="mt-16">' + esc(f.name) + '</h3>' +
        '<div class="firm-est">✓ ' + esc(f.foundedLabel) + '</div>' +
        '<blockquote class="firm-quote">' + esc(f.claim) +
          '<cite>— ' + esc(f.name) + '’s own published claim</cite></blockquote>' +

        '<div class="fact-grid">' +
          '<div class="fact"><span class="fact-l">Licence</span><span class="fact-v">' +
            (f.licence === 'lawyers+paralegals' ? 'Lawyers &amp; paralegals' : 'Licensed paralegals') + '</span></div>' +
          '<div class="fact"><span class="fact-l">Team</span><span class="fact-v">' + esc(f.team) + '</span></div>' +
          '<div class="fact"><span class="fact-l">Coverage</span><span class="fact-v">' + esc(f.coverage) + '</span></div>' +
          '<div class="fact"><span class="fact-l">Their listed price</span><span class="fact-v">from ' + money0(f.from) + '</span></div>' +
        '</div>' +

        (o.repCost && o.repCost[0]
          ? '<div class="price-hint mt-16">For ' + esc(o.label.toLowerCase()) + ', Ontario representation typically runs <strong>' +
            money0(o.repCost[0]) + '–' + money0(o.repCost[1]) + '</strong>. <span class="tag-est">estimate</span> ' +
            'Ask them to confirm a flat fee in writing before you retain.</div>'
          : '') +

        '<a class="reviews-link" target="_blank" rel="noopener nofollow" ' +
          'href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(f.name + ' Ontario') + '">' +
          '<span class="reviews-star">★</span>' +
          '<span><b>Read real Google reviews</b><br><small>Opens Google Maps — fresh and unfiltered</small></span>' +
          '<span class="reviews-arrow">↗</span>' +
        '</a>' +

        '<button class="btn btn-amber btn-lg btn-block mt-24" type="button" data-pick>Continue → free case review</button>' +
        '<p class="trust">Quoted lines are the firm’s own public claims, not Drivee’s assessment. ' +
        'We forward your info to this firm only.</p>' +
      '</div>'
    );
    $('[data-back]', stage).addEventListener('click', function () { renderFirms(); });
    $('[data-pick]', stage).addEventListener('click', function () { renderLeadForm(idx); });
    track('firm_opened', f.id);
  }

  /* ── lead form ─────────────────────────────────────────────────── */
  function ticketSummary(t) {
    var o = ON.offence(t.doc_type);
    var s = [];
    s.push('Charge: ' + o.label);
    if (t.amount) s.push('Fine: ' + money(t.amount));
    if (o.demerit) s.push('Demerit: ' + o.demerit + ' pts');
    if (t.ticket_number) s.push('Ref: ' + t.ticket_number);
    if (t.plate) s.push('Plate: ' + t.plate);
    if (t.issued_date) s.push('Issued: ' + t.issued_date);
    if (t.due_date) s.push('Due: ' + t.due_date);
    if (t.municipality) s.push('Where: ' + t.municipality + (t.province ? ', ' + t.province : ''));
    if (t.statute_section) s.push('Section: ' + t.statute_section);
    if (t.confidence !== 'high') s.push('(scan confidence: ' + t.confidence + ')');
    return s.join(' · ');
  }

  function renderLeadForm(idx) {
    var f = state.firms[idx];
    var t = state.ticket;

    show(
      '<div class="card card-pad">' +
        '<button class="lv-back" type="button" data-back>‹ Back</button>' +
        '<div class="eyebrow eyebrow-amber mt-16">Free case review</div>' +
        '<h3 class="mt-16">with ' + esc(f.name) + '</h3>' +
        '<div class="lead-summary mono">' + esc(ticketSummary(t)) + '</div>' +
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
          '. Drivee is not a law firm, gives no legal advice, and takes no commission.</p>' +
        '</form>' +
      '</div>'
    );

    $('[data-back]', stage).addEventListener('click', function () { renderFirmDetail(idx); });
    $('.lead-form', stage).addEventListener('submit', function (e) {
      e.preventDefault();
      submitLead(e.target, f, t);
    });
    track('lead_form', f.id);
  }

  function submitLead(form, firm, t) {
    if (state.busy) return;
    var err = $('.lead-err', form);
    var btn = form.querySelector('button[type=submit]');
    var data = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      phone: form.phone.value.trim(),
      note: form.note.value.trim(),
      company: form.company.value,
      firmName: firm.name,
      firmEmail: firm.email,
      ticket: ticketSummary(t)
    };

    if (!data.name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email)) {
      err.hidden = false;
      err.textContent = 'Please enter your name and a valid email.';
      return;
    }

    state.busy = true; btn.disabled = true; btn.textContent = 'Sending…'; err.hidden = true;

    fetch('/api/lead', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
      .then(function (r) { return r.json().catch(function () { return { ok: r.ok }; }); })
      .then(function (res) {
        state.busy = false;
        if (!res || !res.ok) throw new Error((res && res.error) || 'Send failed');
        renderThanks(firm);
        track('lawyer_lead', firm.id);
      })
      .catch(function (e) {
        state.busy = false; btn.disabled = false;
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

  /* ── intake ────────────────────────────────────────────────────── */
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
      var r = new FileReader();
      r.onerror = function () { showError('Could not read the photo — try selecting it again'); };
      r.onload = function (ev) {
        var type = file.type;
        if (['image/jpeg', 'image/png', 'image/gif', 'image/webp'].indexOf(type) === -1) type = 'image/jpeg';
        send(ev.target.result, type);
      };
      r.readAsDataURL(file);
    });
  }

  function send(dataUrl, mediaType) {
    var base64 = dataUrl.split(',')[1];
    var ctrl = (typeof AbortController === 'function') ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 60000) : null;

    fetch('/api/scan-ticket', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: ctrl ? ctrl.signal : undefined,
      body: JSON.stringify({ image: base64, mediaType: mediaType })
    })
      .then(function (r) {
        if (timer) clearTimeout(timer);
        return r.json().catch(function () { throw new Error('Server error (' + r.status + ')'); });
      })
      .then(function (res) {
        if (!res.ok) { showError(res.error || 'No ticket detected — try a clearer photo'); return; }
        if (res.outOfProvince) { renderOutOfProvince(res.ticket, res.jurisdiction); return; }
        renderVerdict(res.ticket);
      })
      .catch(function (e) {
        if (timer) clearTimeout(timer);
        showError(e && e.name === 'AbortError'
          ? 'Scan timed out — try again with a smaller photo'
          : (e.message || 'Could not reach Drivee — check your connection'));
      });
  }

  /* ── dropzone wiring ───────────────────────────────────────────── */
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

  addEventListener('paste', function (e) {
    var items = (e.clipboardData && e.clipboardData.items) || [];
    for (var i = 0; i < items.length; i++) {
      if (items[i].type && items[i].type.indexOf('image') === 0) {
        handleFile(items[i].getAsFile());
        return;
      }
    }
  });

  // expose for the local end-to-end harness
  window.__driveeRenderVerdict = renderVerdict;
  window.__driveeRenderOOP = renderOutOfProvince;
})();
