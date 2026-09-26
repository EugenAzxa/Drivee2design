// Daily cron — emails + pushes drivers before a ticket deadline.
// Runs once a day (see vercel.json). For every reminder due in exactly 3 days
// or 1 day, it sends an email (Resend) and a Web Push (if the user has a
// subscription).
//
// Required env vars (Vercel → Settings → Environment Variables):
//   SUPABASE_URL                — already present
//   SUPABASE_SERVICE_ROLE_KEY   — service role key (read all rows, bypass RLS)
//   RESEND_API_KEY              — from resend.com
//   VAPID_PUBLIC_KEY            — the public VAPID key (also embedded client-side)
//   VAPID_PRIVATE_KEY           — the private VAPID key (secret!)
//   CRON_SECRET                 — optional: protect the endpoint from public hits

var https = require('https');

function httpsRequest(urlStr, options) {
  options = options || {};
  return new Promise(function(resolve, reject) {
    try {
      var u = new URL(urlStr);
      var body = options.body || null;
      var headers = options.headers || {};
      if (body && !headers['Content-Length']) headers['Content-Length'] = Buffer.byteLength(body);
      var req = https.request({
        hostname: u.hostname, port: u.port || 443,
        path: u.pathname + u.search, method: options.method || 'GET', headers: headers
      }, function(r) {
        var chunks = [];
        r.on('data', function(c){ chunks.push(c); });
        r.on('end', function(){ resolve({ status: r.statusCode, body: Buffer.concat(chunks).toString('utf8') }); });
      });
      req.on('error', reject);
      req.setTimeout(8000, function(){ req.destroy(new Error('timeout')); });
      if (body) req.write(body);
      req.end();
    } catch (e) { reject(e); }
  });
}

function ymd(d) { return d.toISOString().slice(0, 10); }

module.exports = async function handler(req, res) {
  // Optional shared-secret guard so randoms can't trigger sends.
  if (process.env.CRON_SECRET) {
    var auth = req.headers['authorization'] || '';
    var provided = auth.replace('Bearer ', '') || (req.query && req.query.key) || '';
    if (provided !== process.env.CRON_SECRET) return res.status(401).json({ error: 'unauthorized' });
  }

  var SUPA = process.env.SUPABASE_URL || 'https://ofnsssyiiejohcnbejxq.supabase.co';
  var SVC  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SVC) return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY not set' });

  // Target dates: today + 3 and today + 1
  var now = new Date();
  var in3 = new Date(now.getTime() + 3 * 86400000);
  var in1 = new Date(now.getTime() + 1 * 86400000);
  var targets = {}; targets[ymd(in3)] = 3; targets[ymd(in1)] = 1;
  var dateList = Object.keys(targets);

  // Pull reminders due on those dates (service role bypasses RLS).
  // reminders table: id, user_id, ticket_ref, due_date, email (added column)
  var q = SUPA + '/rest/v1/reminders?select=id,ticket_ref,due_date,email,user_id'
        + '&due_date=in.(' + dateList.map(function(d){ return '"' + d + '"'; }).join(',') + ')';
  var reminders = [];
  try {
    var r = await httpsRequest(q, { headers: { apikey: SVC, Authorization: 'Bearer ' + SVC, Accept: 'application/json' } });
    if (r.status >= 200 && r.status < 300) reminders = JSON.parse(r.body) || [];
    else return res.status(500).json({ error: 'reminders fetch failed', status: r.status, body: r.body.slice(0, 200) });
  } catch (e) { return res.status(500).json({ error: 'reminders fetch threw', detail: String(e).slice(0, 200) }); }

  // Pull all push subscriptions so we can match by email.
  var subsByEmail = {};
  try {
    var sr = await httpsRequest(SUPA + '/rest/v1/push_subscriptions?select=endpoint,p256dh,auth,email',
      { headers: { apikey: SVC, Authorization: 'Bearer ' + SVC, Accept: 'application/json' } });
    if (sr.status >= 200 && sr.status < 300) {
      (JSON.parse(sr.body) || []).forEach(function(s){
        if (!s.email) return;
        var k = s.email.toLowerCase();
        (subsByEmail[k] = subsByEmail[k] || []).push(s);
      });
    }
  } catch (e) { /* push optional */ }

  // ── Send email via Resend ──
  var RESEND = process.env.RESEND_API_KEY;
  var sentEmail = 0, sentPush = 0, skipped = 0;

  // Lazy-load web-push only if we have keys
  var webpush = null;
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    try {
      webpush = require('web-push');
      webpush.setVapidDetails('mailto:drivee.canada@gmail.com',
        (process.env.VAPID_PUBLIC_KEY || '').trim(), (process.env.VAPID_PRIVATE_KEY || '').trim());
    } catch (e) { webpush = null; }
  }

  for (var i = 0; i < reminders.length; i++) {
    var rem = reminders[i];
    var days = targets[rem.due_date];
    var ref = rem.ticket_ref || 'your ticket';
    var email = (rem.email || '').toLowerCase();
    var whenTxt = days === 1 ? 'tomorrow' : 'in ' + days + ' days';

    // EMAIL
    if (RESEND && email) {
      var subject = days === 1
        ? '⏰ ' + ref + ' is due tomorrow — pay it to dodge late fees'
        : '🅿️ ' + ref + ' is due in 3 days';
      var html =
        '<div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:480px;margin:0 auto">' +
          '<h2 style="color:#0E1B3D;margin:0 0 8px">Your fine is due ' + whenTxt + '</h2>' +
          '<p style="color:#5a6075;line-height:1.5">Ticket <b>' + ref + '</b> is due on <b>' + rem.due_date + '</b>. ' +
          'Pay before the deadline to avoid Toronto\'s escalating late fees (+$15 at day 16, +$80 by day 60).</p>' +
          '<p><a href="https://drivee.ca/app.html" style="display:inline-block;background:#2E64FF;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700">Open Drivee</a></p>' +
          '<p style="color:#8c95a7;font-size:12px;margin-top:24px">You\'re getting this because you set a reminder in Drivee. No marketing — just deadline alerts. Reply STOP to unsubscribe.</p>' +
        '</div>';
      try {
        var er = await httpsRequest('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + RESEND },
          body: JSON.stringify({ from: 'Drivee <reminders@drivee.ca>', to: [email], subject: subject, html: html })
        });
        if (er.status >= 200 && er.status < 300) sentEmail++;
      } catch (e) { /* continue */ }
    }

    // PUSH
    if (webpush && email && subsByEmail[email]) {
      var payload = JSON.stringify({
        title: days === 1 ? '⏰ Fine due tomorrow' : '🅿️ Fine due in 3 days',
        body: ref + ' is due ' + rem.due_date + '. Tap to open Drivee and pay before late fees hit.',
        url: '/app.html', tag: 'reminder-' + rem.id, requireInteraction: true
      });
      for (var j = 0; j < subsByEmail[email].length; j++) {
        var s = subsByEmail[email][j];
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload);
          sentPush++;
        } catch (e) { /* dead subscription — ignore */ }
      }
    }
    if (!RESEND && !webpush) skipped++;
  }

  return res.status(200).json({
    ok: true, ranAt: now.toISOString(),
    remindersDue: reminders.length, emailsSent: sentEmail, pushesSent: sentPush, skipped: skipped
  });
};
