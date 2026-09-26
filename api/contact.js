// Contact form endpoint - forwards messages to drivee.canada@gmail.com via Resend.
// POST { name, email, message } -> { ok: true }
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'POST only' });

  var RESEND = process.env.RESEND_API_KEY;
  if (!RESEND) return res.status(500).json({ ok: false, error: 'Mail not configured' });

  var b = req.body || {};
  var name = String(b.name || '').slice(0, 100).trim();
  var email = String(b.email || '').slice(0, 200).trim();
  var message = String(b.message || '').slice(0, 4000).trim();

  // Honeypot: real users never fill the hidden "company" field
  if (b.company) return res.status(200).json({ ok: true });

  if (!name || !message || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ ok: false, error: 'Please fill your name, a valid email and a message.' });
  }

  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  try {
    var r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + RESEND },
      body: JSON.stringify({
        from: 'Drivee Contact <reminders@drivee.ca>',
        to: ['drivee.canada@gmail.com'],
        reply_to: email,
        subject: 'Contact form: ' + name,
        html:
          '<div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:520px;margin:0 auto">' +
            '<h2 style="margin:0 0 10px;color:#0E1B3D">New message from drivee.ca</h2>' +
            '<p style="color:#333"><b>Name:</b> ' + esc(name) + '<br/><b>Email:</b> ' + esc(email) + '</p>' +
            '<p style="white-space:pre-wrap;line-height:1.55;color:#333;border-top:1px solid #eee;padding-top:12px">' + esc(message) + '</p>' +
          '</div>'
      })
    });
    if (r.status >= 200 && r.status < 300) return res.status(200).json({ ok: true });
    console.log('[contact] resend status', r.status);
    return res.status(502).json({ ok: false, error: 'Mail service error - try emailing us directly.' });
  } catch (e) {
    console.log('[contact] error', e && e.message);
    return res.status(500).json({ ok: false, error: 'Send failed - try emailing us directly.' });
  }
};
