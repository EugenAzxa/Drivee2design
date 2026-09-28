// Runs every image in tools/tickets/ through the real scan endpoint and
// prints what came back, so "does it actually work on real tickets" has an
// answer you can read rather than a guess.
//
//   1. put photos in  tools/tickets/   (jpg/png/webp — real ones are best)
//   2. put your key in .env.local      CLAUDE_API_KEY=sk-ant-...
//   3. npm run test:tickets
//
// Add an expectations file next to an image to assert on it:
//   tools/tickets/my-ticket.jpg
//   tools/tickets/my-ticket.json   { "doc_type": "parking", "amount": 30 }

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIR = path.join(__dirname, 'tickets');

// load .env.local / .env the same way the dev server does
for (const f of ['.env.local', '.env']) {
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}

const handler = require('../api/scan-ticket.js');

const MEDIA = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

function fakeRes() {
  const r = { statusCode: 200, body: null, headers: {} };
  r.setHeader = (k, v) => { r.headers[k] = v; };
  r.status = (c) => { r.statusCode = c; return r; };
  r.json = (o) => { r.body = o; return r; };
  r.end = () => r;
  return r;
}

function pad(s, n) { return String(s == null ? '—' : s).padEnd(n); }

(async () => {
  if (!process.env.CLAUDE_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    console.error('\n  No CLAUDE_API_KEY found.\n  Create .env.local in the project root:\n\n    CLAUDE_API_KEY=sk-ant-...\n');
    process.exit(1);
  }
  if (!fs.existsSync(DIR)) {
    fs.mkdirSync(DIR, { recursive: true });
    console.error('\n  Created ' + path.relative(ROOT, DIR) + ' — drop ticket photos in there and re-run.\n');
    process.exit(1);
  }

  const files = fs.readdirSync(DIR).filter((f) => MEDIA[path.extname(f).toLowerCase()]);
  if (!files.length) {
    console.error('\n  No images in ' + path.relative(ROOT, DIR) + '. Drop some ticket photos in and re-run.\n');
    process.exit(1);
  }

  console.log('\n  Scanning ' + files.length + ' ticket(s) with claude-opus-5\n');

  let pass = 0, fail = 0, checked = 0;

  for (const file of files) {
    const abs = path.join(DIR, file);
    const b64 = fs.readFileSync(abs).toString('base64');
    const mediaType = MEDIA[path.extname(file).toLowerCase()];
    const sizeKb = Math.round(fs.statSync(abs).size / 1024);

    process.stdout.write('  ' + pad(file, 30) + ' ' + pad(sizeKb + 'KB', 8));
    const t0 = Date.now();

    const res = fakeRes();
    await handler({ method: 'POST', headers: {}, body: { image: b64, mediaType } }, res);
    const secs = ((Date.now() - t0) / 1000).toFixed(1);

    if (!res.body || !res.body.ok) {
      console.log('FAILED  ' + secs + 's  — ' + ((res.body && res.body.error) || 'status ' + res.statusCode));
      fail++;
      continue;
    }

    const t = res.body.ticket;
    console.log('ok  ' + secs + 's  conf=' + t.confidence);
    console.log('      ' + [
      t.doc_type,
      t.amount != null ? '$' + t.amount : 'no amount',
      t.municipality || 'no city',
      t.plate || 'no plate',
      t.issued_date || 'no date'
    ].join('  ·  '));
    if (t.offence_text) console.log('      offence: ' + t.offence_text);
    if ((t.unreadable_fields || []).length) console.log('      unreadable: ' + t.unreadable_fields.join(', '));
    console.log('      advice: ' + t.advice);

    // optional assertions
    const expectFile = abs.replace(/\.[^.]+$/, '.json');
    if (fs.existsSync(expectFile)) {
      const expect = JSON.parse(fs.readFileSync(expectFile, 'utf8'));
      const misses = [];
      for (const [k, v] of Object.entries(expect)) {
        const got = t[k];
        const same = (typeof v === 'number' && typeof got === 'number')
          ? Math.abs(v - got) < 0.01
          : String(got || '').toLowerCase() === String(v || '').toLowerCase();
        if (!same) misses.push(k + ': expected ' + JSON.stringify(v) + ', got ' + JSON.stringify(got));
      }
      checked++;
      if (misses.length) { fail++; misses.forEach((m) => console.log('      MISMATCH ' + m)); }
      else { pass++; console.log('      ✓ matches expectations'); }
    }
    console.log('');
  }

  console.log('  ─────────────────────────────────────────');
  console.log('  scanned ' + files.length + (checked ? '  ·  asserted ' + checked + '  ·  pass ' + pass + '  ·  fail ' + fail : ''));
  console.log('');
})();
