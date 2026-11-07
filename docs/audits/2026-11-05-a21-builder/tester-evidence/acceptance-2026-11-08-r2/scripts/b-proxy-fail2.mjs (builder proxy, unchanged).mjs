// Scratch only: serves a built client and forwards /api to the scratch server after a delay each way.
// usage: node proxy.mjs <distDir> <listenPort> <delayMs>
import http from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const [dist, port, delay] = [process.argv[2], Number(process.argv[3]), Number(process.argv[4] ?? 0)];
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json' };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

let mode = 'off'; let skip = 0; const log = [];
http.createServer(async (req, res) => {
  if (req.url.startsWith('/__mode/')) { const [m, n] = req.url.slice(8).split('@'); mode = m; skip = Number(n || 0); log.length = 0; res.writeHead(200); res.end(mode); return; }
  if (req.url.startsWith('/__log')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(log)); return; }
  if (req.url.startsWith('/api') && req.method !== 'GET') log.push(`${req.method} ${req.url.replace(/[0-9a-f-]{36}/g, ':id')}`);
  const matches = { create: req.method === 'POST' && /\/notes\/[^/]+\/blocks$/.test(req.url.split('?')[0]),
    reorder: /\/blocks\/reorder/.test(req.url), placement: /\/block-placements\//.test(req.url),
    save: /\/text-save/.test(req.url), hang: /\/unit-transfer/.test(req.url),
    fail: /\/unit-transfer/.test(req.url), slowreply: /\/unit-transfer/.test(req.url),
    stall: /\/text-save/.test(req.url), stallfail: /\/text-save/.test(req.url), stall25: /\/text-save/.test(req.url), holdsaves: /\/text-save/.test(req.url), blackhole: /\/text-save/.test(req.url) };
  let slow = 0;
  if (mode !== 'off' && matches[mode]) {
    if (skip > 0) skip -= 1;
    else {
      // hang and fail stay on until switched off, as the earlier matrix's proxy did; the rest fire once.
      const kind = mode; if (kind !== 'hang' && kind !== 'fail' && kind !== 'holdsaves' && kind !== 'blackhole') mode = 'off';
      log.push(`FAULT ${kind}`);
      // slowreply: the request reaches the server at once; only its reply is held back.
      if (kind === 'slowreply') slow = 3000;
      // stall / stallfail: one text save is held 12 s before it reaches the server (as a request held in the
      // browser would be), then forwarded, or answered 500 without reaching it. Round 2, red 1.
      // holdsaves (stays on): every text save waits 3 s before it reaches the server; one whose page went away
      // meanwhile is dropped there, as a request the browser cancels never arrives. Round 2, 3b.
      // blackhole (stays on): text saves never reach the server and never answer. Round 2, 3b.
      else if (kind === 'blackhole') { for await (const _ of req); log.push('DROPPED text-save'); return; }
      else if (kind === 'holdsaves') {
        const body = []; for await (const c of req) body.push(c);
        let gone = false; res.on('close', () => { if (!res.writableEnded) gone = true; });
        await wait(3000);
        if (gone || req.socket.destroyed) { log.push('DROPPED text-save'); return; }
        const upstream = http.request({ host: '127.0.0.1', port: 3001, path: req.url, method: req.method, headers: req.headers }, async (reply) => {
          await wait(delay); res.writeHead(reply.statusCode, reply.headers); reply.pipe(res); });
        upstream.on('error', () => { res.writeHead(502); res.end(); });
        upstream.end(Buffer.concat(body));
        return;
      }
      else if (kind === 'stall' || kind === 'stallfail' || kind === 'stall25') {
        const body = []; for await (const c of req) body.push(c);
        const raw = Buffer.concat(body);
        try { const j = JSON.parse(raw.toString('utf8')); const units = j?.block?.content_json?.text_flow?.units || [];
          log.push(`HELD ${units.map((u) => `${u.writing_role && u.writing_role !== 'paragraph' ? `[${u.writing_role}]` : ''}${u.text}`).join('|')}`); } catch { /* not json */ }
        await wait(kind === 'stall25' ? 25000 : 12000);
        if (kind === 'stallfail') { res.writeHead(500, { 'Content-Type': 'application/json' }); res.end('{"error":"synthetic failure"}'); return; }
        const upstream = http.request({ host: '127.0.0.1', port: 3001, path: req.url, method: req.method, headers: req.headers }, async (reply) => {
          await wait(delay); res.writeHead(reply.statusCode, reply.headers); reply.pipe(res); });
        upstream.on('error', () => { res.writeHead(502); res.end(); });
        upstream.end(raw);
        return;
      }
      else {
      for await (const _ of req);
      if (kind === 'hang') return;
      await wait(delay * 2); res.writeHead(500, { 'Content-Type': 'application/json' }); res.end('{"error":"synthetic failure"}'); return;
      }
    }
  }
  if (req.url.startsWith('/api')) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    await wait(delay);
    const upstream = http.request({ host: '127.0.0.1', port: 3001, path: req.url, method: req.method, headers: req.headers }, async (reply) => {
      await wait(delay + slow);
      res.writeHead(reply.statusCode, reply.headers);
      reply.pipe(res);
    });
    upstream.on('error', () => { res.writeHead(502); res.end(); });
    upstream.end(Buffer.concat(chunks));
    return;
  }
  const path = normalize(req.url.split('?')[0]);
  let file = join(dist, path === '\\' || path === '/' ? 'index.html' : path);
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(dist, 'index.html');
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
}).listen(port, () => console.log('proxy', port, 'delay', delay));
