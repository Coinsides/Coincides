// Fault-injection transport for the unchanged C-fix1 synthetic paper fixture.
// No application route, database, environment file, or browser automation here.
import assert from 'node:assert/strict';
import http from 'node:http';

const upstream = 'http://127.0.0.1:5185';
const fixture = await (await fetch(`${upstream}/api/__c-fix1-fixture`)).json();
assert.equal(fixture.database, ':memory:');
assert.equal(fixture.noteId, 'c-fix1-note');
let failNextRestore = false;
const journal = [];
const server = http.createServer(async (req, res) => {
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks);
    if (req.url === '/__c-fix2/control' && req.method === 'POST') {
      failNextRestore = true;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ failNextRestore, target: 'c-fix1-b' }));
      return;
    }
    if (req.url === '/__c-fix2/journal' && req.method === 'GET') {
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ database: ':memory:', failNextRestore, journal }));
      return;
    }
    const isSave = req.method === 'PUT' && /\/text-save$/.test(req.url);
    const input = isSave ? JSON.parse(body.toString()) : undefined;
    if (failNextRestore && req.url === '/api/note-blocks/c-fix1-b/text-save'
      && input?.text_ranges.some(range => range.history_restore === true)) {
      failNextRestore = false;
      journal.push({ path: req.url, input, status: 503, injected: true });
      res.writeHead(503, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'F17 synthetic restore failure', details: { code: 'f17_injected_restore_failure' } }));
      return;
    }
    const response = await fetch(`${upstream}${req.url}`, {
      method: req.method,
      headers: { 'content-type': req.headers['content-type'] || 'application/json' },
      ...(!['GET', 'HEAD'].includes(req.method) ? { body } : {}),
    });
    const bytes = Buffer.from(await response.arrayBuffer());
    if (isSave) journal.push({ path: req.url, input, status: response.status, response: JSON.parse(bytes.toString()) });
    res.writeHead(response.status, { 'content-type': response.headers.get('content-type') || 'application/octet-stream' });
    res.end(bytes);
  } catch (error) {
    res.writeHead(502, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: String(error) }));
  }
});
server.listen(5186, '127.0.0.1', () => console.log('F17 synthetic fault proxy: http://127.0.0.1:5186/scripts/cFix1Smoke/index.html'));
process.on('SIGINT', () => server.close());
