// Case-review lead endpoint. The lead comes to Drivee first — the ops inbox
// gets the full request and a Telegram ping — and Drivee connects the driver
// with the firm they picked. The driver gets a receipt of exactly what was sent.
//
// POST { name, email, phone, note, firmName, firmEmail, ticket } -> { ok: true }
//
// SECURITY: the preferred firm is only ever resolved against the allowlist
// below, and nothing is mailed to an address the client supplies other than
// the driver's own receipt.

var FIRMS = {
  'info@xcopper.com':                  'X-Copper Professional Corp',
  'info@x-cops.ca':                    'Toronto Traffic Law',
  'toronto@pointts.com':               'POINTTS Advisory Services',
  'info@ontariotraffictickets.com':    'OTT Legal',
  'info@hwy-law.com':                  'HWY-LAW Criminal Defence'
};

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

  function telegram() {
    var text = [
      '🎯 New case review lead',
      '👤 ' + name,
      '✉️ ' + email,
      phone ? '📞 ' + phone : null,
      '⚖️ Wants: ' + firmName,
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

  // The lead reaches Drivee by email and Telegram. Either one landing is
  // enough — a lead lost to one flaky provider is a driver nobody calls back.
  var channels = [];
  if (RESEND) {
    channels.push(send({
      from: 'Drivee Leads <reminders@drivee.ca>',
      to: [OPS_INBOX],
      reply_to: email,
      subject: 'Case review lead — ' + name + ' → ' + firmName,
      html: shell(
        'New case review request',
        'From drivee.ca. Connect the driver with their preferred firm within one business day.',
        rows,
        'Reply to this email to reach the driver directly.'
      )
    }));
  }
  if (TG_TOKEN && TG_CHAT) channels.push(telegram());

  var results = await Promise.allSettled(channels);
  var delivered = results.some(function (r) { return r.status === 'fulfilled'; });
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
      subject: 'We got your case review request',
      html: shell(
        'Request received',
        'We’ll connect you with ' + esc(firmName) + ' for a free case review, usually within one business day.',
        rows,
        'This is exactly what you sent us. We share it with ' + esc(firmName) + ' and nobody else. ' +
        'Drivee is not a law firm and takes no commission. Questions: reply to this email.'
      )
    }).catch(function () {});
  }

  return res.status(200).json({ ok: true });
};
