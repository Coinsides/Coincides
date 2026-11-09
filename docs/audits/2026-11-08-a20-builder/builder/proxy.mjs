// Scratch only: serves a built client on loopback, forwards /api to 127.0.0.1:3001 after a delay each way,
// and counts every non-GET /api request it forwards (GET /__writes reads the list, /__writes/reset clears it). /__mode/401 answers every /api request 401 until /__mode/off; /__mode/slowsave holds each text-save reply 3 s (the write itself goes through).
import http from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
const [dist, port, delay] = [process.argv[2], Number(process.argv[3]), Number(process.argv[4] ?? 0)];
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json' };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let writes = []; let mode = 'off';
http.createServer(async (req, res) => {
  if (req.url === '/__writes') { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(writes)); return; }
  if (req.url === '/__writes/reset') { writes = []; res.end('ok'); return; }
  if (req.url.startsWith('/__mode/')) { mode = req.url.slice(8); res.end(mode); return; }
  if (req.url.startsWith('/api')) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    if (req.method !== 'GET') writes.push({ t: Date.now(), m: req.method, u: req.url.replace(/[0-9a-f-]{36}/g, ':id') });
    if (mode === '401') { await wait(delay); res.writeHead(401, { 'content-type': 'application/json' }); res.end('{"error":"expired"}'); return; }
    await wait(delay);
    const slow = mode === 'slowsave' && req.method === 'PUT' && req.url.endsWith('/text-save');
    const up = http.request({ host: '127.0.0.1', port: 3001, path: req.url, method: req.method, headers: req.headers }, async (reply) => {
      await wait(delay + (slow ? 3000 : 0)); res.writeHead(reply.statusCode, reply.headers); reply.pipe(res);
    });
    up.on('error', () => { res.writeHead(502); res.end(); });
    up.end(Buffer.concat(chunks));
    return;
  }
  const path = normalize(req.url.split('?')[0]);
  let file = join(dist, path === String.fromCharCode(92) || path === "/" ? "index.html" : path);
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(dist, 'index.html');
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
}).listen(port, '127.0.0.1', () => console.log('proxy', port, 'delay', delay));
