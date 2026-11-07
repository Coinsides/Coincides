// Editor rework acceptance: static builds with /api forwarded to the island through the tunnel (127.0.0.1:13002).
//   13154 = r2.3c package rebuilt from 9bc45e69 + its src files
import { existsSync, readFileSync, statSync } from 'node:fs';
import http from 'node:http';
import { extname, join, normalize } from 'node:path';

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.json': 'application/json' };
const serve = (dist, port, label) => http.createServer(async (req, res) => {
  if (req.url.startsWith('/api')) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const upstream = http.request({ host: '127.0.0.1', port: 13002, path: req.url, method: req.method, headers: { ...req.headers, host: '127.0.0.1:13002' } }, (reply) => {
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
}).listen(port, '127.0.0.1', () => console.log(`${label} on ${port} -> island via 13002`));

serve('<tmp>/edacc/dist-r23c', 13154, 'r2.3c');
