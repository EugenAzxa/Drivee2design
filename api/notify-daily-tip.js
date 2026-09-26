// Daily cron — pushes one "Did you know?" Toronto-driving fact to every
// device that subscribed to notifications. Rotates by day-of-year.
//
// Required env vars:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY
//   CRON_SECRET (optional guard)

// A compact rotation of the most shareable facts (kept in sync with the
// in-app DRIVEE_TIPS — short headline only, since a push has limited room).
var TIPS = [
  'Toronto issues 7,400 parking tickets every day — about $9M/month.',
  'Honking unnecessarily is a $110 fine under the Highway Traffic Act.',
  'Splashing a pedestrian with a puddle can cost you $365.',
  'Eating while driving = $615 fine + 3 demerit points.',
  'Parking in front of your OWN driveway is still a $50 fine.',
  '30% of disputed parking tickets get reduced or cancelled — most people never try.',
  'A speed-camera ticket can raise your insurance ~$1,500/year for 3 years.',
  'Stunt driving (50+ over) = car towed on the spot + $2,000 + 7-day suspension.',
  'You have 15 days to pay — after that it climbs ~$80 in late fees.',
  'Parking in a bike lane is a $150–$300 fine. Enforcement tripled since 2022.',
  'Within 3m of a fire hydrant = $100. No "just running in."',
  '15 demerit points = automatic licence suspension. Check yours at ontario.ca.',
  'Towed on a Friday night? You can owe $400+ by Monday.',
  'Passing a stopped school bus = $400–$2,000 + 6 demerit points.',
  'Unpaid tickets past 60 days block your plate renewal — even a $30 one.',
  'A rolling stop is 3 demerit points — same as running a red light.',
  'Toronto charges for street parking 7 days a week — Sundays too. Read the sign.',
  'Distracted driving: the $615 fine is the cheap part — insurance is the real hit.',
  'Toronto has 150+ red light cameras and 75+ speed cameras — and growing.',
  'Green P parking is free after 9pm on most downtown streets — verify the sign.'
];

var https = require('https');
function httpsRequest(urlStr, options) {
  options = options || {};
  return new Promise(function(resolve, reject) {
    try {
      var u = new URL(urlStr);
      var body = options.body || null, headers = options.headers || {};
      if (body && !headers['Content-Length']) headers['Content-Length'] = Buffer.byteLength(body);
      var req = https.request({ hostname: u.hostname, port: u.port || 443, path: u.pathname + u.search, method: options.method || 'GET', headers: headers }, function(r) {
        var chunks = []; r.on('data', function(c){ chunks.push(c); });
        r.on('end', function(){ resolve({ status: r.statusCode, body: Buffer.concat(chunks).toString('utf8') }); });
      });
      req.on('error', reject);
      req.setTimeout(8000, function(){ req.destroy(new Error('timeout')); });
      if (body) req.write(body);
      req.end();
    } catch (e) { reject(e); }
  });
}

function dayOfYear() {
  var now = new Date();
  var start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now - start) / 86400000);
}

module.exports = async function handler(req, res) {
  if (process.env.CRON_SECRET) {
    var auth = req.headers['authorization'] || '';
    var provided = auth.replace('Bearer ', '') || (req.query && req.query.key) || '';
    if (provided !== process.env.CRON_SECRET) return res.status(401).json({ error: 'unauthorized' });
  }

  var SUPA = process.env.SUPABASE_URL || 'https://ofnsssyiiejohcnbejxq.supabase.co';
  var SVC  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SVC) return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY not set' });

  var webpush;
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return res.status(500).json({ error: 'VAPID keys not set' });
  }
  try {
    webpush = require('web-push');
    // Trim to defend against a stray space/newline pasted into the env var.
    webpush.setVapidDetails(
      'mailto:drivee.canada@gmail.com',
      (process.env.VAPID_PUBLIC_KEY || '').trim(),
      (process.env.VAPID_PRIVATE_KEY || '').trim()
    );
  } catch (e) { return res.status(500).json({ error: 'web-push load failed', detail: String(e).slice(0, 160) }); }

  // Pull all push subscriptions
  var subs = [];
  try {
    var r = await httpsRequest(SUPA + '/rest/v1/push_subscriptions?select=endpoint,p256dh,auth',
      { headers: { apikey: SVC, Authorization: 'Bearer ' + SVC, Accept: 'application/json' } });
    if (r.status >= 200 && r.status < 300) subs = JSON.parse(r.body) || [];
    else return res.status(500).json({ error: 'subs fetch failed', status: r.status });
  } catch (e) { return res.status(500).json({ error: 'subs fetch threw', detail: String(e).slice(0, 120) }); }

  var tip = TIPS[dayOfYear() % TIPS.length];
  var payload = JSON.stringify({
    title: '💡 Did you know?',
    body: tip,
    url: '/app.html',
    tag: 'daily-tip'
  });

  var sent = 0, dead = [];
  for (var i = 0; i < subs.length; i++) {
    var s = subs[i];
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload);
      sent++;
    } catch (e) {
      // 404/410 = subscription expired — collect for cleanup
      if (e && (e.statusCode === 404 || e.statusCode === 410)) dead.push(s.endpoint);
    }
  }

  // Best-effort cleanup of dead subscriptions
  for (var k = 0; k < dead.length; k++) {
    try {
      await httpsRequest(SUPA + '/rest/v1/push_subscriptions?endpoint=eq.' + encodeURIComponent(dead[k]),
        { method: 'DELETE', headers: { apikey: SVC, Authorization: 'Bearer ' + SVC } });
    } catch (e) {}
  }

  return res.status(200).json({ ok: true, tip: tip, subscriptions: subs.length, sent: sent, cleaned: dead.length });
};
