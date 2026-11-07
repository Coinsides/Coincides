// Serves a built client locally and forwards /api to the island through the existing tunnel.
// The A-18 fix is client only, so this is the real backend with the fixed client, without a deployment.
import { existsSync, readFileSync, statSync } from 'node:fs';
import http from 'node:http';
import { extname, join, normalize } from 'node:path';

const ROOT = '<tmp>/r04a';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.json': 'application/json' };
function proxy(build, port) {
  const dist = `${ROOT}/${build}/client/dist`;
  http.createServer(async (req, res) => {
    if (req.url.startsWith('/api')) {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const headers = { ...req.headers, host: '127.0.0.1:13002' };
      const upstream = http.request({ host: '127.0.0.1', port: 13002, path: req.url, method: req.method, headers }, (reply) => { res.writeHead(reply.statusCode, reply.headers); reply.pipe(res); });
      upstream.on('error', () => { res.writeHead(502); res.end(); });
      upstream.end(Buffer.concat(chunks));
      return;
    }
    const path = normalize(req.url.split('?')[0]);
    let file = join(dist, path === '\\' || path === '/' ? 'index.html' : path);
    if (!existsSync(file) || statSync(file).isDirectory()) file = join(dist, 'index.html');
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  }).listen(port, '127.0.0.1', () => console.log('island proxy', build, port));
}
proxy('pre', 13141);
proxy('post', 13142);
