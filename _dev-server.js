// Local dev server. Serves the static site AND runs the /api/* serverless
// functions in-process, so the scanner and the lead flow work end to end on
// localhost exactly as they do on Vercel. Not deployed.
//
//   node _dev-server.js          →  http://localhost:8765
//   PORT=3000 node _dev-server.js
//
// Reads .env.local (then .env) for CLAUDE_API_KEY / RESEND_API_KEY.

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 8765;
const ROOT = __dirname;

// ── .env loading (no dependency) ──────────────────────────────────
for (const file of ['.env.local', '.env']) {
  const p = path.join(ROOT, file);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2].trim().replace(/^["']|["']$/g, '');
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
  console.log('· loaded ' + file);
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8', '.webmanifest': 'application/manifest+json',
  '.glb': 'model/gltf-binary', '.mp4': 'video/mp4', '.woff2': 'font/woff2'
};

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      // mirror Vercel's ~4.5MB body ceiling so local behaviour matches prod
      if (size > 4.5 * 1024 * 1024) { req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch (e) { resolve(raw); }
    });
    req.on('error', () => resolve({}));
  });
}

// Minimal Vercel-style res shim over the Node response.
function decorate(res) {
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (obj) => {
    const body = JSON.stringify(obj);
    if (!res.headersSent) res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(body);
    return res;
  };
  res.send = (body) => { res.end(body); return res; };
  return res;
}

async function handleApi(req, res, route) {
  const file = path.join(ROOT, 'api', route + '.js');
  if (!fs.existsSync(file)) {
    return decorate(res).status(404).json({ ok: false, error: 'No such API route: ' + route });
  }
  let handler;
  try {
    delete require.cache[require.resolve(file)];   // pick up edits without a restart
    handler = require(file);
  } catch (e) {
    console.error('  ! failed to load api/' + route + '.js:', e.message);
    return decorate(res).status(500).json({ ok: false, error: 'Handler failed to load: ' + e.message });
  }

  req.body = await readBody(req);
  req.query = Object.fromEntries(new URL(req.url, 'http://localhost').searchParams);

  const started = Date.now();
  try {
    await handler(req, decorate(res));
  } catch (e) {
    console.error('  ! api/' + route + ' threw:', e && e.message);
    if (!res.headersSent) decorate(res).status(500).json({ ok: false, error: e.message });
  }
  console.log('  → /api/' + route + '  ' + res.statusCode + '  ' + (Date.now() - started) + 'ms');
}

http.createServer(async (req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);

  if (urlPath.startsWith('/api/')) {
    const route = urlPath.slice(5).replace(/\/+$/, '');
    if (!/^[a-z0-9-]+$/i.test(route)) {
      return decorate(res).status(400).json({ ok: false, error: 'Bad API route' });
    }
    return handleApi(req, res, route);
  }

  // Match Vercel's static behaviour: a trailing-slash path serves index.html
  if (urlPath.endsWith('/')) urlPath += 'index.html';
  const filePath = path.join(ROOT, urlPath);
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); return res.end('forbidden'); }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // /desktop.html → / , matching the production redirect
      if (urlPath === '/desktop.html') {
        res.writeHead(301, { Location: '/' });
        return res.end();
      }
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('not found: ' + urlPath);
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0'
    });
    res.end(data);
  });
}).listen(PORT, () => {
  const key = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
  console.log('');
  console.log('  Drivee  →  http://localhost:' + PORT);
  console.log('');
  console.log('  ticket scanner : ' + (key ? 'ready (key loaded)' : 'NO KEY — set CLAUDE_API_KEY in .env.local'));
  console.log('  lead email     : ' + (process.env.RESEND_API_KEY ? 'ready' : 'not configured (RESEND_API_KEY)'));
  console.log('');
});
