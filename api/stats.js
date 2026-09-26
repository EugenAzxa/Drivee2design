// Aggregated analytics for the internal dashboard.
// Reads /analytics rows from Supabase, returns rolled-up JSON.
// Uses node:https instead of fetch — bulletproof across all Node versions.

var https = require('https');

var ALLOWED_ORIGINS = [
  'https://drivee.ca',
  'https://www.drivee.ca',
  'http://localhost',
  'http://127.0.0.1'
];

// Pull up to this many most-recent rows. Sized so 2+ months of usage at
// early-stage volumes fits in a single response — bumped from 10k to give
// the 60-day "last 2 months" window room to breathe.
var FETCH_LIMIT = 50000;

function httpsGet(urlStr, headers) {
  return new Promise(function(resolve, reject) {
    try {
      var u = new URL(urlStr);
      var req = https.request({
        hostname: u.hostname,
        port: u.port || 443,
        path: u.pathname + u.search,
        method: 'GET',
        headers: headers || {}
      }, function(r) {
        var chunks = [];
        r.on('data', function(c) { chunks.push(c); });
        r.on('end', function() {
          resolve({ status: r.statusCode, body: Buffer.concat(chunks).toString('utf8') });
        });
      });
      req.on('error', reject);
      req.setTimeout(8000, function(){ req.destroy(new Error('Supabase request timed out')); });
      req.end();
    } catch (e) { reject(e); }
  });
}

function dayKey(iso) {
  // "YYYY-MM-DD" — bucketing in UTC keeps things simple
  return iso.slice(0, 10);
}

function topN(map, n) {
  return Object.keys(map)
    .map(function(k){ return { key: k, count: map[k] }; })
    .sort(function(a, b){ return b.count - a.count; })
    .slice(0, n);
}

module.exports = async function handler(req, res) {
  var origin = req.headers.origin || req.headers.referer || '';
  var allowed = ALLOWED_ORIGINS.some(function(o){ return origin.indexOf(o) === 0; });

  res.setHeader('Access-Control-Allow-Origin', allowed ? origin : ALLOWED_ORIGINS[0]);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET')     return res.status(405).json({ error: 'Method not allowed' });

  var supabaseUrl = process.env.SUPABASE_URL || 'https://ofnsssyiiejohcnbejxq.supabase.co';
  // Anon key is already public (shipped in index.html to every visitor),
  // so a hardcoded fallback is safe and removes the env-var setup step.
  var supabaseKey = process.env.SUPABASE_ANON_KEY
    || process.env.SUPABASE_KEY
    || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mbnNzc3lpaWVqb2hjbmJlanhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MDE4OTcsImV4cCI6MjA5MTA3Nzg5N30._C3k82OSOklVtKaWT4zl1rWGJyaokiRQC9H6y5VhS58';

  // Pull recent rows. Use Range header to override Supabase's default 1000-row cap.
  var url = supabaseUrl + '/rest/v1/analytics?select=*&order=created_at.desc';
  var rows = [];
  try {
    var resp = await httpsGet(url, {
      'apikey': supabaseKey,
      'Authorization': 'Bearer ' + supabaseKey,
      'Range': '0-' + (FETCH_LIMIT - 1),
      'Accept': 'application/json'
    });
    if (resp.status < 200 || resp.status >= 300) {
      return res.status(500).json({
        error: 'Supabase request failed',
        status: resp.status,
        body: resp.body.slice(0, 400)
      });
    }
    try {
      rows = JSON.parse(resp.body);
    } catch (e) {
      return res.status(500).json({ error: 'Supabase response not JSON', body: resp.body.slice(0, 400) });
    }
    if (!Array.isArray(rows)) {
      return res.status(500).json({ error: 'Supabase response was not an array', body: JSON.stringify(rows).slice(0, 400) });
    }
  } catch (e) {
    return res.status(500).json({ error: 'Network error', detail: String(e && e.message || e).slice(0, 400) });
  }

  // Parse out the JSON meta blob written by track.js. Older rows that wrote a
  // plain meta string fall back to { m: <string> } so aggregation still works.
  function parseMeta(raw) {
    if (!raw) return {};
    var s = String(raw);
    if (s.charAt(0) === '{') {
      try { return JSON.parse(s); } catch (e) { return { m: s }; }
    }
    return { m: s };
  }

  // Normalise rows so a missing column doesn't blow up aggregation
  rows = rows.map(function(r){
    var meta = parseMeta(r.meta);
    return {
      event: r.event || '',
      metaRaw: r.meta || '',
      m:    meta.m   || '',
      city: meta.city || '',
      os:   meta.os   || '',
      dev:  meta.dev  || '',
      br:   meta.br   || '',
      sid:  meta.sid  || '',
      uid:  meta.uid  || '',
      auth: !!meta.auth,
      created_at: r.created_at || r.inserted_at || r.timestamp || new Date(0).toISOString()
    };
  });

  // ── Aggregate ────────────────────────────────────────
  var now = Date.now();
  var DAY = 86400000;
  var todayCutoff   = now - 1  * DAY;
  var weekCutoff    = now - 7  * DAY;
  var monthCutoff   = now - 30 * DAY;
  var twoMonthCutoff = now - 60 * DAY;

  var totals = { today: 0, last7d: 0, last30d: 0, last60d: 0, allTime: rows.length };
  var byEvent = {};
  var byTab   = {};
  var byDay   = {};   // YYYY-MM-DD → count, last 14 days
  var byCity  = {};
  var byDevice = {};  // "Form factor / OS" → count
  var byBrowser = {};
  var funnel  = { app_open: 0, scan_ticket: 0, scan_success: 0, dispute_generated: 0 };
  var recent  = [];

  // Unique-user buckets (uid → first seen ts)
  var uidsToday = {}, uids7d = {}, uids30d = {}, uids60d = {}, uidsAll = {};
  var uidFirstApp = {};      // uid → ts of FIRST app_open ever — counts "tried the app"
  var appOpens = 0;

  // Email signups (from magic_link_sent events).
  // Meta format: "user@example.com|source" — split + dedupe by email.
  var signupsByEmail = {};   // email → { first: ts, last: ts, source, count }
  var signupsRecent = [];

  // Sign-in method counts (Google vs email-code vs which CTA) from the
  // source tag on magic_link_sent events.
  var byMethod = {};

  // Session aggregation: { sid: { first, last, authed, city, device } }
  var sessions = {};
  var authedSessions = 0, anonSessions = 0;

  // Build a 14-day skeleton so days with zero events still show up
  var trendDays = 14;
  for (var i = 0; i < trendDays; i++) {
    var d = new Date(now - i * DAY).toISOString().slice(0, 10);
    byDay[d] = 0;
  }

  rows.forEach(function(row) {
    var ts = new Date(row.created_at).getTime();
    if (ts >= todayCutoff)    totals.today++;
    if (ts >= weekCutoff)     totals.last7d++;
    if (ts >= monthCutoff)    totals.last30d++;
    if (ts >= twoMonthCutoff) totals.last60d++;

    byEvent[row.event] = (byEvent[row.event] || 0) + 1;

    // Unique users (uid-scoped) per time window
    if (row.uid) {
      uidsAll[row.uid] = true;
      if (ts >= todayCutoff)    uidsToday[row.uid] = true;
      if (ts >= weekCutoff)     uids7d[row.uid]    = true;
      if (ts >= monthCutoff)    uids30d[row.uid]   = true;
      if (ts >= twoMonthCutoff) uids60d[row.uid]   = true;
      if (row.event === 'app_open') {
        if (!uidFirstApp[row.uid] || ts < uidFirstApp[row.uid]) {
          uidFirstApp[row.uid] = ts;
        }
      }
    }
    if (row.event === 'app_open') appOpens++;

    // Capture email signups + sign-in method from magic_link_sent events
    if (row.event === 'magic_link_sent' && row.m) {
      var parts = String(row.m).split('|');
      var email = (parts[0] || '').trim().toLowerCase();
      var source = (parts[1] || '').trim();
      var hasEmail = email && email.indexOf('@') !== -1;

      // Method tally: if the meta is just a tag (e.g. "google-start") with no
      // email, the tag itself is the method. Otherwise the source after "|".
      var method = hasEmail ? (source || 'email') : (email || 'unknown');
      // Normalise: "google" / "code" / "loss-cta" / "main" / "sheet" / "google-start"
      byMethod[method] = (byMethod[method] || 0) + 1;

      if (hasEmail) {
        var existing = signupsByEmail[email];
        if (!existing) {
          signupsByEmail[email] = { first: ts, last: ts, source: source || 'email', count: 1 };
        } else {
          existing.count++;
          if (ts > existing.last) existing.last = ts;
          if (ts < existing.first) existing.first = ts;
          // Prefer a concrete method source over a blank one
          if (source && (!existing.source || existing.source === 'unknown')) existing.source = source;
        }
      }
    }

    if (row.event === 'tab_click' && row.m) {
      var tabName = String(row.m).replace(/^tab-/, '') || 'unknown';
      byTab[tabName] = (byTab[tabName] || 0) + 1;
    }

    if (row.city) byCity[row.city] = (byCity[row.city] || 0) + 1;

    if (row.dev || row.os) {
      var deviceKey = (row.dev || 'Unknown') + (row.os ? ' · ' + row.os : '');
      byDevice[deviceKey] = (byDevice[deviceKey] || 0) + 1;
    }
    if (row.br) byBrowser[row.br] = (byBrowser[row.br] || 0) + 1;

    var dk = dayKey(row.created_at);
    if (dk in byDay) byDay[dk]++;

    if (funnel.hasOwnProperty(row.event)) funnel[row.event]++;

    // Session tracking
    if (row.sid) {
      var s = sessions[row.sid];
      if (!s) {
        s = { first: ts, last: ts, authed: row.auth, city: row.city, device: row.dev + ' · ' + row.os };
        sessions[row.sid] = s;
      } else {
        if (ts < s.first) s.first = ts;
        if (ts > s.last)  s.last  = ts;
        if (row.auth) s.authed = true;
        if (!s.city && row.city) s.city = row.city;
      }
    }
  });

  // Session duration distribution
  var sids = Object.keys(sessions);
  var durations = sids.map(function(sid){
    var s = sessions[sid];
    if (s.authed) authedSessions++; else anonSessions++;
    return Math.round((s.last - s.first) / 1000); // seconds
  });
  durations.sort(function(a,b){ return a-b; });

  function pct(n) {
    if (!durations.length) return 0;
    var idx = Math.min(durations.length - 1, Math.floor((n/100) * durations.length));
    return durations[idx];
  }
  var sessionStats = {
    total:    sids.length,
    avg:      durations.length ? Math.round(durations.reduce(function(a,b){return a+b;},0) / durations.length) : 0,
    median:   pct(50),
    p90:      pct(90),
    longest:  durations.length ? durations[durations.length-1] : 0
  };

  recent = rows.slice(0, 30).map(function(r){
    return {
      event: r.event,
      meta: r.m || '',
      city: r.city || '',
      device: r.dev ? (r.dev + ' · ' + r.os) : '',
      browser: r.br || '',
      authed: r.auth,
      created_at: r.created_at
    };
  });

  var dailyTrend = Object.keys(byDay)
    .sort()
    .map(function(date){ return { date: date, count: byDay[date] }; });

  // "Tried the app" = unique uids who triggered app_open
  var triedTotal = Object.keys(uidFirstApp).length;
  var triedToday = 0, tried7d = 0, tried30d = 0, tried60d = 0;
  Object.keys(uidFirstApp).forEach(function(uid){
    var ts = uidFirstApp[uid];
    if (ts >= todayCutoff)    triedToday++;
    if (ts >= weekCutoff)     tried7d++;
    if (ts >= monthCutoff)    tried30d++;
    if (ts >= twoMonthCutoff) tried60d++;
  });

  // Signups summary: count by time window + sorted recent list
  var signupKeys = Object.keys(signupsByEmail);
  var signupToday = 0, signup7d = 0, signup30d = 0, signup60d = 0;
  signupKeys.forEach(function(email){
    var s = signupsByEmail[email];
    // Use FIRST submission timestamp — that's when the email entered our system
    if (s.first >= todayCutoff)    signupToday++;
    if (s.first >= weekCutoff)     signup7d++;
    if (s.first >= monthCutoff)    signup30d++;
    if (s.first >= twoMonthCutoff) signup60d++;
  });
  signupsRecent = signupKeys
    .map(function(email){
      var s = signupsByEmail[email];
      return { email: email, first: s.first, last: s.last, source: s.source, count: s.count };
    })
    .sort(function(a, b){ return b.first - a.first; })
    .slice(0, 50)
    .map(function(s){
      return {
        email: s.email,
        firstAt: new Date(s.first).toISOString(),
        lastAt:  new Date(s.last).toISOString(),
        source:  s.source,
        attempts: s.count
      };
    });

  // How many days of data does the fetched window actually cover?
  // Useful so the dashboard can warn when 60-day numbers are partial.
  var oldestTs = rows.length ? new Date(rows[rows.length - 1].created_at).getTime() : now;
  var coverageDays = Math.max(0, Math.round((now - oldestTs) / DAY));
  var capped = rows.length >= FETCH_LIMIT;

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    fetchedAt: new Date().toISOString(),
    rowCount: rows.length,
    coverageDays: coverageDays,
    fetchCapped: capped,
    fetchLimit: FETCH_LIMIT,
    totals: totals,
    users: {
      today:   Object.keys(uidsToday).length,
      last7d:  Object.keys(uids7d).length,
      last30d: Object.keys(uids30d).length,
      last60d: Object.keys(uids60d).length,
      allTime: Object.keys(uidsAll).length,
      appOpens: appOpens,
      triedTotal:   triedTotal,
      triedToday:   triedToday,
      tried7d:      tried7d,
      tried30d:     tried30d,
      tried60d:     tried60d
    },
    signups: {
      totalEmails: signupKeys.length,
      today:       signupToday,
      last7d:      signup7d,
      last30d:     signup30d,
      last60d:     signup60d,
      recent:      signupsRecent
    },
    signinMethods: topN(byMethod, 10),
    byEvent: topN(byEvent, 20),
    byTab:   topN(byTab, 10),
    byCity:  topN(byCity, 15),
    byDevice: topN(byDevice, 10),
    byBrowser: topN(byBrowser, 6),
    auth: {
      authedEvents: rows.filter(function(r){ return r.auth; }).length,
      anonEvents:   rows.filter(function(r){ return !r.auth; }).length,
      authedSessions: authedSessions,
      anonSessions:   anonSessions
    },
    sessions: sessionStats,
    dailyTrend: dailyTrend,
    funnel: funnel,
    recent: recent
  });
};
