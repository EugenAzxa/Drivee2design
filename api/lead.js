// Lawyer lead endpoint — forwards a scanned ticket to the defence firm the
// driver picked, copies the driver, and blind-copies Drivee.
//
// POST { name, email, phone, note, firmName, firmEmail, ticket } -> { ok: true }
//
// SECURITY: firmEmail is never trusted from the client. It is looked up in
// the allowlist below, so this endpoint can never be driven as an open relay.

var FIRMS = {
  'info@xcopper.com':                  'X-Copper Professional Corp',
  'info@x-cops.ca':                    'Toronto Traffic Law',
  'toronto@pointts.com':               'POINTTS Advisory Services',
  'info@ontariotraffictickets.com':    'OTT Legal',
  'info@hwy-law.com':                  'HWY-LAW Criminal Defence'
};

var OPS_INBOX = 'drivee.canada@gmail.com';

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'POST only' });

  var RESEND = process.env.RESEND_API_KEY;
  if (!RESEND) return res.status(500).json({ ok: false, error: 'Mail not configured' });

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

  async function send(payload) {
    return fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + RESEND },
      body: JSON.stringify(payload)
    });
  }

  try {
    // 1. the firm — this is the lead
    var r = await send({
      from: 'Drivee Referrals <reminders@drivee.ca>',
      to: [firmEmail],
      bcc: [OPS_INBOX],
      reply_to: email,
      subject: 'Free case review request via Drivee — ' + name,
      html: shell(
        'New case review request',
        'Sent from drivee.ca — the driver chose your firm from a matched shortlist.',
        rows,
        'Referral code DRIVEE · no commission is charged. Reply directly to reach the driver.'
      )
    });

    if (!(r.status >= 200 && r.status < 300)) {
      console.log('[lead] resend status', r.status);
      return res.status(502).json({ ok: false, error: 'Mail service error' });
    }

    // 2. the driver — their copy/receipt. Best-effort; never fails the request.
    send({
      from: 'Drivee <reminders@drivee.ca>',
      to: [email],
      subject: 'Your case review request to ' + firmName,
      html: shell(
        'Request sent to ' + esc(firmName),
        'They usually reply within one business day.',
        rows,
        'This is exactly what we shared — nothing else, and with no other firm. ' +
        'Drivee is not a law firm and takes no commission. Questions: ' + OPS_INBOX
      )
    }).catch(function () {});

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.log('[lead] error', e && e.message);
    return res.status(500).json({ ok: false, error: 'Send failed — try emailing the firm directly.' });
  }
};
