// Case-review lead endpoint.
//  · Partner firms (DIRECT below) get the request straight in their inbox,
//    and Drivee gets a tracking copy plus a Telegram ping.
//  · Every other firm: the lead comes to Drivee, which connects the driver.
// The driver always gets a receipt of exactly what was sent.
//
// POST { name, email, phone, note, firmName, firmEmail, ticket } -> { ok: true }
//
// SECURITY: the preferred firm is only ever resolved against the allowlist
// below, and nothing is mailed to an address the client supplies other than
// the driver's own receipt.

var FIRMS = {
  'info@bajwalawfirm.ca':                'Bajwa Law Firm',
  'info@xcopper.com':                  'X-Copper Professional Corp',
  'info@x-cops.ca':                    'Toronto Traffic Law',
  'toronto@pointts.com':               'POINTTS Advisory Services',
  'info@ontariotraffictickets.com':    'OTT Legal',
  'info@hwy-law.com':                  'HWY-LAW Criminal Defence'
};

// Partners who have agreed to receive leads directly.
var DIRECT = { 'info@bajwalawfirm.ca': true };

var OPS_INBOX = process.env.LEAD_INBOX || 'drivee.canada@gmail.com';

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'POST only' });

  var RESEND = process.env.RESEND_API_KEY;
  var TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  var TG_CHAT = process.env.TELEGRAM_CHAT_ID;
  if (!RESEND && !(TG_TOKEN && TG_CHAT)) {
    return res.status(500).json({ ok: false, error: 'Lead delivery not configured' });
  }

  var b = req.body || {};

  // Honeypot: real users never fill the hidden "company" field.
  if (b.company) return res.status(200).json({ ok: true });

  var name   = String(b.name || '').slice(0, 100).trim();
  var email  = String(b.email || '').slice(0, 200).trim();
  var phone  = String(b.phone || '').slice(0, 40).trim();
  var note   = String(b.note || '').slice(0, 2000).trim();
  var ticket = String(b.ticket || '').slice(0, 600).trim();

  var firmEmail = String(b.firmEmail || '').toLowerCase().trim();
  var firmName  = FIRMS[firmEmail];

  if (!firmName) return res.status(400).json({ ok: false, error: 'Unknown firm' });
  var direct = !!DIRECT[firmEmail];
  if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ ok: false, error: 'Please enter your name and a valid email.' });
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  var rows =
    '<p style="color:#333;line-height:1.7">' +
      '<b>Name:</b> ' + esc(name) + '<br/>' +
      '<b>Email:</b> ' + esc(email) + '<br/>' +
      (phone ? '<b>Phone:</b> ' + esc(phone) + '<br/>' : '') +
      '<b>Preferred firm:</b> ' + esc(firmName) + '<br/>' +
    '</p>' +
    '<p style="background:#F4F6FB;border-radius:10px;padding:12px 14px;' +
      'font-family:ui-monospace,Menlo,monospace;font-size:13px;color:#0B1430">' +
      esc(ticket) +
    '</p>' +
    (note ? '<p style="white-space:pre-wrap;line-height:1.6;color:#333">' + esc(note) + '</p>' : '');

  function shell(title, intro, body, footer) {
    return '<div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:560px;margin:0 auto">' +
      '<h2 style="margin:0 0 6px;color:#0E1B3D">' + title + '</h2>' +
      '<p style="margin:0 0 16px;color:#6B7280;font-size:14px">' + intro + '</p>' +
      body +
      '<p style="margin-top:22px;padding-top:14px;border-top:1px solid #eee;color:#9AA1B2;font-size:12px">' +
        footer +
      '</p>' +
      '<p style="margin-top:10px;color:#9AA1B2;font-size:12px">' +
        'Sent via <a href="https://www.drivee.ca/?utm_source=email&amp;utm_medium=lead" ' +
        'style="color:#2D63F0;font-weight:700;text-decoration:none">drivee.ca</a>' +
        ' · free ticket scanner for Ontario drivers' +
      '</p>' +
    '</div>';
  }

  function send(payload) {
    return fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + RESEND },
      body: JSON.stringify(payload)
    }).then(function (r) {
      if (!(r.status >= 200 && r.status < 300)) throw new Error('resend ' + r.status);
      return true;
    });
  }

  function telegram(status) {
    var text = [
      direct ? '🎯 Lead sent to ' + firmName : '🎯 New case review lead',
      status ? status : null,
      '👤 ' + name,
      '✉️ ' + email,
      phone ? '📞 ' + phone : null,
      direct ? null : '⚖️ Wants: ' + firmName,
      '🎫 ' + ticket,
      note ? '📝 ' + note.slice(0, 500) : null
    ].filter(Boolean).join('\n');
    return fetch('https://api.telegram.org/bot' + TG_TOKEN + '/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TG_CHAT, text: text })
    }).then(function (r) {
      if (!r.ok) throw new Error('telegram ' + r.status);
      return true;
    });
  }

  // 1. Partner firm: the request goes straight to them, reply-to the driver.
  var firmOk = null;
  if (direct && RESEND) {
    firmOk = await send({
      from: 'Drivee Referrals <reminders@drivee.ca>',
      to: [firmEmail],
      reply_to: email,
      subject: 'Free case review request via Drivee — ' + name,
      html: shell(
        'New case review request',
        'Sent from drivee.ca by a driver who scanned their ticket and chose to contact your firm.',
        rows,
        'Reply to this email to reach the driver directly.'
      )
    }).then(function () { return true; }, function (e) {
      console.log('[lead] firm email failed', e && e.message);
      return false;
    });
  }
  var status = firmOk === false ? '⚠️ FIRM EMAIL FAILED — forward this lead manually' : null;

  // 2. Drivee's copy, by email and Telegram. For partner leads it is the
  // tracking record; for everyone else it is the lead itself. Either channel
  // landing is enough — a lead lost to one flaky provider is a driver nobody
  // calls back.
  var channels = [];
  if (RESEND) {
    channels.push(send({
      from: 'Drivee Leads <reminders@drivee.ca>',
      to: [OPS_INBOX],
      reply_to: email,
      subject: (status ? '⚠️ ' : '') + (direct ? 'Lead sent to ' : 'Case review lead — ') +
        (direct ? firmName + ' — ' + name : name + ' → ' + firmName),
      html: shell(
        direct ? 'Lead sent to ' + esc(firmName) : 'New case review request',
        status ? status
          : direct ? 'Delivered to ' + esc(firmEmail) + '. This copy is for tracking.'
          : 'From drivee.ca. Connect the driver with their preferred firm within one business day.',
        rows,
        'Reply to this email to reach the driver directly.'
      )
    }));
  }
  if (TG_TOKEN && TG_CHAT) channels.push(telegram(status));

  var results = await Promise.allSettled(channels);
  var delivered = firmOk === true || results.some(function (r) { return r.status === 'fulfilled'; });
  results.forEach(function (r) {
    if (r.status === 'rejected') console.log('[lead] channel failed', r.reason && r.reason.message);
  });

  if (!delivered) {
    return res.status(502).json({ ok: false, error: 'Send failed' });
  }

  // The driver's receipt. Best-effort; never fails the request. Awaited, since
  // a serverless function can be frozen as soon as the response is sent.
  if (RESEND) {
    await send({
      from: 'Drivee <reminders@drivee.ca>',
      to: [email],
      reply_to: OPS_INBOX,
      subject: direct ? 'Your request was sent to ' + firmName : 'We got your case review request',
      html: shell(
        direct ? 'Sent to ' + esc(firmName) : 'Request received',
        direct ? esc(firmName) + ' will reply to you directly. Here’s a copy of what we sent them.'
          : 'We’ll connect you with ' + esc(firmName) + ' for a free case review, usually within one business day.',
        rows,
        'This is exactly what you sent us. We share it with ' + esc(firmName) + ' and nobody else. ' +
        'Drivee is not a law firm and takes no commission. Questions: reply to this email.'
      )
    }).catch(function () {});
  }

  return res.status(200).json({ ok: true });
};
