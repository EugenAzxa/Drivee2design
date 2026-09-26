// Ticket Rampage leaderboard - reads game_score events out of the shared
// analytics table (no separate DB table needed) and returns the top scores.
// Each game_score row stores meta.m = "name|score|wave".
var https = require('https');

var ALLOWED_ORIGINS = ['https://drivee.ca', 'https://www.drivee.ca', 'http://localhost', 'http://127.0.0.1'];

function httpsGet(urlStr, headers) {
  return new Promise(function (resolve, reject) {
    try {
      var u = new URL(urlStr);
      var req = https.request({ hostname: u.hostname, port: u.port || 443, path: u.pathname + u.search, method: 'GET', headers: headers || {} }, function (r) {
        var chunks = [];
        r.on('data', function (c) { chunks.push(c); });
        r.on('end', function () { resolve({ status: r.statusCode, body: Buffer.concat(chunks).toString('utf8') }); });
      });
      req.on('error', reject);
      req.setTimeout(8000, function () { req.destroy(new Error('timeout')); });
      req.end();
    } catch (e) { reject(e); }
  });
}

module.exports = async function handler(req, res) {
  var origin = req.headers.origin || req.headers.referer || '';
  var allowed = ALLOWED_ORIGINS.some(function (o) { return origin.indexOf(o) === 0; });
  res.setHeader('Access-Control-Allow-Origin', allowed ? origin : ALLOWED_ORIGINS[1]);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  var supabaseUrl = process.env.SUPABASE_URL || 'https://ofnsssyiiejohcnbejxq.supabase.co';
  var supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY
    || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mbnNzc3lpaWVqb2hjbmJlanhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MDE4OTcsImV4cCI6MjA5MTA3Nzg5N30._C3k82OSOklVtKaWT4zl1rWGJyaokiRQC9H6y5VhS58';

  var url = supabaseUrl + '/rest/v1/analytics?select=meta,created_at&event=eq.game_score&order=created_at.desc';
  try {
    var resp = await httpsGet(url, { apikey: supabaseKey, Authorization: 'Bearer ' + supabaseKey, Range: '0-4999', Accept: 'application/json' });
    if (resp.status < 200 || resp.status >= 300) return res.status(200).json({ scores: [] });
    var rows = JSON.parse(resp.body);
    if (!Array.isArray(rows)) rows = [];

    // best score per name
    var best = {};
    rows.forEach(function (r) {
      var m;
      try { m = JSON.parse(r.meta); } catch (e) { return; }
      var raw = (m && m.m) || '';
      var parts = String(raw).split('|');
      if (parts.length < 2) return;
      var name = parts[0].slice(0, 14).replace(/[^\w \-]/g, '').trim() || 'ANON';
      var score = parseInt(parts[1], 10);
      var wave = parseInt(parts[2], 10) || 0;
      if (!isFinite(score) || score < 0 || score > 10000000) return;
      var key = name.toUpperCase();
      if (!best[key] || score > best[key].score) best[key] = { name: name, score: score, wave: wave, at: r.created_at };
    });

    var scores = Object.keys(best).map(function (k) { return best[k]; })
      .sort(function (a, b) { return b.score - a.score; })
      .slice(0, 20);

    res.setHeader('Cache-Control', 'public, max-age=15');
    return res.status(200).json({ scores: scores });
  } catch (e) {
    return res.status(200).json({ scores: [] });
  }
};
