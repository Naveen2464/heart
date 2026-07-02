// MediXR Development Server — HTTP + HTTPS with Network Display
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const HTTP_PORT = 8080;
const HTTPS_PORT = 8443;
const ROOT_DIR = __dirname;

// MIME types
const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.ttf': 'font/ttf', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.mp4': 'video/mp4',
  '.webm': 'video/webm', '.webp': 'image/webp', '.wasm': 'application/wasm',
};

function handleRequest(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  const filePath = path.join(ROOT_DIR, urlPath);

  if (!filePath.startsWith(ROOT_DIR)) { res.writeHead(403); res.end(); return; }

  if (req.method === 'HEAD') {
    const exists = fs.existsSync(filePath) && fs.statSync(filePath).isFile();
    res.writeHead(exists ? 200 : 404);
    res.end();
    return;
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    const idx = path.join(filePath, 'index.html');
    if (fs.existsSync(idx)) { serve(idx, res, req); return; }
    res.writeHead(404); res.end('Not Found');
    return;
  }
  serve(filePath, res, req);
}

function serve(fp, res, req) {
  const ext = path.extname(fp).toLowerCase();
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
  const c = '\x1b[32m', r = '\x1b[0m';
  console.log('  ' + c + 'GET 200' + r + '  ' + req.url);
}

function getIPs() {
  const ifaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(ifaces)) {
    for (const i of ifaces[name]) {
      if (i.family === 'IPv4' && !i.internal) ips.push(i.address);
    }
  }
  return ips;
}

function genCert() {
  const certDir = path.join(ROOT_DIR, 'certs');
  const pfxPath = path.join(certDir, 'server.pfx');

  if (fs.existsSync(pfxPath)) {
    console.log('  \x1b[32m✅\x1b[0m Using existing SSL certificate');
    return { pfx: fs.readFileSync(pfxPath), passphrase: 'medixr' };
  }

  if (!fs.existsSync(certDir)) fs.mkdirSync(certDir, { recursive: true });

  console.log('  🔐 Generating self-signed SSL certificate...');
  const ips = getIPs();
  const names = ['localhost', '127.0.0.1', ...ips];
  const psScript = path.join(certDir, 'generate.ps1');

  try {
    const namesArg = names.join(',');
    execSync(
      'powershell -NoProfile -ExecutionPolicy Bypass -File "' + psScript + '" -OutDir "' + certDir + '" -Names ' + namesArg,
      { stdio: 'pipe', timeout: 20000 }
    );

    if (fs.existsSync(pfxPath)) {
      console.log('  \x1b[32m✅\x1b[0m SSL certificate generated');
      return { pfx: fs.readFileSync(pfxPath), passphrase: 'medixr' };
    }
  } catch (e) {
    const msg = e.stderr ? e.stderr.toString().split('\n')[0] : e.message;
    console.log('  \x1b[33m⚠️\x1b[0m  Cert generation failed: ' + msg);
  }
  return null;
}

function banner(httpsOk) {
  const ips = getIPs();
  const R = '\x1b[0m', B = '\x1b[1m', G = '\x1b[32m', Y = '\x1b[33m';
  const C = '\x1b[36m', M = '\x1b[35m', D = '\x1b[90m';

  console.log('');
  console.log('  ' + C + '╔══════════════════════════════════════════════╗' + R);
  console.log('  ' + C + '║' + R + '  ' + B + M + '🫀 MediXR Development Server' + R + '                 ' + C + '║' + R);
  console.log('  ' + C + '╚══════════════════════════════════════════════╝' + R);
  console.log('');

  console.log('  ' + Y + '⚡ HTTP' + R + ' ' + D + '(Desktop / 3D View)' + R);
  console.log('     Local:    ' + B + G + 'http://localhost:' + HTTP_PORT + R);
  console.log('     Local:    ' + G + 'http://127.0.0.1:' + HTTP_PORT + R);
  ips.forEach(function(ip) { console.log('     Network:  ' + G + 'http://' + ip + ':' + HTTP_PORT + R); });
  console.log('');

  if (httpsOk) {
    console.log('  ' + Y + '🔒 HTTPS' + R + ' ' + D + '(Mobile AR / WebXR — camera access)' + R);
    console.log('     Local:    ' + B + G + 'https://localhost:' + HTTPS_PORT + R);
    console.log('     Local:    ' + G + 'https://127.0.0.1:' + HTTPS_PORT + R);
    ips.forEach(function(ip) {
      console.log('     Network:  ' + B + G + 'https://' + ip + ':' + HTTPS_PORT + R + '  ' + D + '<- use on phone' + R);
    });
    console.log('');
    console.log('  ' + D + '📱 On phone: accept the "Not Secure" warning (self-signed cert)' + R);
  } else {
    console.log('  ' + Y + '🔒 HTTPS' + R + ' \x1b[31m(unavailable)' + R);
    console.log('     ' + D + 'Tip: On phone Chrome, go to chrome://flags' + R);
    console.log('     ' + D + 'Enable "Insecure origins treated as secure"' + R);
    console.log('     ' + D + 'Add: http://' + (ips[0] || '10.x.x.x') + ':' + HTTP_PORT + R);
  }

  console.log('');
  console.log('  ' + D + '──────────────────────────────────────────────' + R);
  console.log('  ' + D + 'Press Ctrl+C to stop' + R);
  console.log('');
}

// ── Start servers ──
const httpServer = http.createServer(handleRequest);
httpServer.on('error', function(err) {
  if (err.code === 'EADDRINUSE') {
    console.log('\x1b[31m  ❌ Port ' + HTTP_PORT + ' is already in use!\x1b[0m');
    console.log('  Stop the other server first (Ctrl+C), then run again.');
    process.exit(1);
  }
});

httpServer.listen(HTTP_PORT, '0.0.0.0', function() {
  console.log('  ✅ HTTP  server on port ' + HTTP_PORT);

  var ssl = genCert();
  if (ssl) {
    var httpsServer = https.createServer(ssl, handleRequest);
    httpsServer.on('error', function(err) {
      console.log('  ⚠️  HTTPS error: ' + err.message);
      banner(false);
    });
    httpsServer.listen(HTTPS_PORT, '0.0.0.0', function() {
      console.log('  ✅ HTTPS server on port ' + HTTPS_PORT);
      banner(true);
    });
  } else {
    banner(false);
  }
});
