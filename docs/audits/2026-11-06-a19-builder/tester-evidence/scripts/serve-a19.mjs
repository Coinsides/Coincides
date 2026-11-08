// A-19 acceptance static front ends: each port serves one built dist and forwards /api to its own local backend.
// usage: node serve-a19.mjs <port>:<distDir>:<backendPort> [...]
import { existsSync, readFileSync, statSync } from 'node:fs';
import http from 'node:http';
import { extname, join, normalize } from 'node:path';

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.json': 'application/json', '.wasm': 'application/wasm' };
for (const spec of process.argv.slice(2)) {
  const [port, dist, backend] = spec.split(/:(?![\\/])/); // keep the drive colon in C:/...
  http.createServer(async (req, res) => {
    if (req.url.startsWith('/api')) {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const upstream = http.request({ host: '127.0.0.1', port: Number(backend), path: req.url, method: req.method, headers: { ...req.headers, host: `127.0.0.1:${backend}` } }, (reply) => {
        res.writeHead(reply.statusCode, reply.headers);
        reply.pipe(res);
      });
      upstream.on('error', () => { if (!res.headersSent) { res.writeHead(502); res.end(); } });
      upstream.end(Buffer.concat(chunks));
      return;
    }
    const path = normalize(req.url.split('?')[0]);
    let file = join(dist, path === '\\' || path === '/' ? 'index.html' : path);
    if (!existsSync(file) || statSync(file).isDirectory()) file = join(dist, 'index.html');
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  }).listen(Number(port), '127.0.0.1', () => console.log(`${port} -> ${dist}, /api -> ${backend}`));
}
