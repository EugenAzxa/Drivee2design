// Tiny dev server for local preview only. Not deployed.
// Run: node _dev-server.js   →   http://localhost:8765
const http = require('http');
const fs = require('fs');
const path = require('path');
const PORT = 8765;
const ROOT = __dirname;
const MIME = {
  '.html':'text/html', '.js':'application/javascript', '.css':'text/css',
  '.json':'application/json', '.png':'image/png', '.jpg':'image/jpeg',
  '.svg':'image/svg+xml', '.ico':'image/x-icon', '.webmanifest':'application/manifest+json',
  '.glb':'model/gltf-binary', '.mp4':'video/mp4'
};
http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  // Match Vercel's static behaviour: a trailing-slash path serves index.html
  if (urlPath.endsWith('/')) urlPath += 'index.html';
  const filePath = path.join(ROOT, urlPath);
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); return res.end('forbidden'); }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); return res.end('not found: ' + urlPath); }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    });
    res.end(data);
  });
}).listen(PORT, () => console.log('Drivee dev server running at http://localhost:' + PORT));
