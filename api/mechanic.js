// Mobile mechanic endpoint - two flows in one function:
//   POST { type: 'book', ... }  -> customer requests a pre-purchase inspection
//   POST { type: 'apply', ... } -> mechanic applies for the on-call position
// Both forward to drivee.canada@gmail.com via Resend.
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'POST only' });

  var RESEND = process.env.RESEND_API_KEY;
  if (!RESEND) return res.status(500).json({ ok: false, error: 'Mail not configured' });

  var b = req.body || {};
  if (b.company) return res.status(200).json({ ok: true }); // honeypot

  function f(v, n) { return String(v || '').slice(0, n).trim(); }
  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function row(k, v) { return v ? '<p style="margin:4px 0"><b>' + k + ':</b> ' + esc(v) + '</p>' : ''; }

  var type = f(b.type, 10);
  var name = f(b.name, 100);
  var email = f(b.email, 200);
  var phone = f(b.phone, 40);
  var emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);

  var subject, html;

  if (type === 'book') {
    var location = f(b.location, 300);
    var vehicle = f(b.vehicle, 200);
    var when = f(b.when, 200);
    var urgency = f(b.urgency, 40);
    var notes = f(b.notes, 2000);
    if (!name || !phone || !emailOk || !location) {
      return res.status(400).json({ ok: false, error: 'Please fill your name, phone, a valid email and the car location.' });
    }
    subject = 'Inspection booking: ' + name + (urgency === 'asap' ? ' (ASAP)' : '');
    html =
      '<div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:560px;margin:0 auto">' +
        '<h2 style="margin:0 0 10px;color:#0E1B3D">New pre-purchase inspection request</h2>' +
        row('Name', name) + row('Phone', phone) + row('Email', email) +
        row('Car location', location) + row('Vehicle / VIN', vehicle) +
        row('Preferred time', when) + row('Urgency', urgency === 'asap' ? 'ASAP - 24/7 on-call' : 'Scheduled') +
        (notes ? '<p style="white-space:pre-wrap;line-height:1.55;color:#333;border-top:1px solid #eee;padding-top:12px">' + esc(notes) + '</p>' : '') +
      '</div>';
  } else if (type === 'apply') {
    var city = f(b.city, 120);
    var years = f(b.years, 20);
    var cert = f(b.cert, 200);
    var tools = b.tools ? 'Yes' : 'No';
    var oncall = b.oncall ? 'Yes - 24/7 on call' : 'No';
    var areas = f(b.areas, 300);
    var resume = f(b.resume, 4000);
    var link = f(b.link, 300);
    if (!name || !phone || !emailOk || !resume) {
      return res.status(400).json({ ok: false, error: 'Please fill your name, phone, a valid email and your experience.' });
    }
    subject = 'Mechanic application: ' + name + (b.oncall ? ' (24/7)' : '');
    html =
      '<div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:560px;margin:0 auto">' +
        '<h2 style="margin:0 0 10px;color:#0E1B3D">New mobile mechanic application</h2>' +
        row('Name', name) + row('Phone', phone) + row('Email', email) + row('City / base', city) +
        row('Years of experience', years) + row('Certification', cert) +
        row('Own tools + OBD scanner', tools) + row('Available 24/7 on call', oncall) +
        row('Coverage areas', areas) + row('Resume / portfolio link', link) +
        '<p style="white-space:pre-wrap;line-height:1.55;color:#333;border-top:1px solid #eee;padding-top:12px">' + esc(resume) + '</p>' +
      '</div>';
  } else {
    return res.status(400).json({ ok: false, error: 'Unknown request type' });
  }

  try {
    var r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + RESEND },
      body: JSON.stringify({
        from: 'Drivee Mechanic <reminders@drivee.ca>',
        to: ['drivee.canada@gmail.com'],
        reply_to: email,
        subject: subject,
        html: html
      })
    });
    if (r.status >= 200 && r.status < 300) return res.status(200).json({ ok: true });
    console.log('[mechanic] resend status', r.status);
    return res.status(502).json({ ok: false, error: 'Mail service error - email us at drivee.canada@gmail.com' });
  } catch (e) {
    console.log('[mechanic] error', e && e.message);
    return res.status(500).json({ ok: false, error: 'Send failed - email us at drivee.canada@gmail.com' });
  }
};
