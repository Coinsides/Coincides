// Start the real application with a fresh synthetic database for interactive browser QA.
// Run from the repository root: node client/scripts/skinFloatCardSmoke/serve.mjs
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const repo = fileURLToPath(new URL('../../../', import.meta.url));
const base = path.join(repo, '.tmp/floatcard-smoke');
const evidence = path.join(repo, 'docs/audits/2026-09-13-floatcard-builder');
await mkdir(base, { recursive: true }); await mkdir(evidence, { recursive: true });
const run = await mkdtemp(path.join(base, 'run-'));
const envDir = path.join(run, 'empty-env'); await mkdir(envDir);
const dotenv = path.join(envDir, 'synthetic.env'); await writeFile(dotenv, '');
const inherited = Object.fromEntries(['SystemRoot', 'PATH', 'Path', 'TEMP', 'TMP'].flatMap((key) => process.env[key] ? [[key, process.env[key]]] : []));
const apiOrigin = 'http://127.0.0.1:5195'; const appOrigin = 'http://127.0.0.1:5196';
const backend = spawn(process.execPath, ['--import', 'tsx', 'src/index.ts'], {
  cwd: path.join(repo, 'server'), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...inherited, NODE_ENV: 'test', PORT: '5195', DOTENV_CONFIG_PATH: dotenv, JWT_SECRET: 'FloatSmokeKey42',
    DB_PATH: path.join(run, 'synthetic.sqlite'), CANVAS_ASSET_DIR: path.join(run, 'assets'), SOURCE_BLOB_DIR: path.join(run, 'blobs'), UPLOAD_DIR: path.join(run, 'uploads'), COINCIDES_APP_DATA_DIR: path.join(run, 'app-data') },
});
let log = '', token = '', vite;
backend.stdout.on('data', (chunk) => { log += chunk; }); backend.stderr.on('data', (chunk) => { log += chunk; });
backend.on('error', (error) => { log += error.message; });
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function api(url, method = 'GET', body) {
  const response = await fetch(`${apiOrigin}/api${url}`, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  assert.ok(response.ok, `${method} ${url}: ${response.status}`);
  return response.json();
}
async function stop() { await vite?.close(); backend.kill(); await writeFile(path.join(run, 'server.log'), log); }
try {
  for (let i = 0; i < 150 && !log.includes('Coincides server running on http://0.0.0.0:5195'); i++) {
    assert.equal(backend.exitCode, null, `Synthetic server exited: ${log}`); await delay(100);
  }
  assert.ok(log.includes('Coincides server running on http://0.0.0.0:5195'), 'this isolated server must own the port');
  const registration = await api('/auth/register', 'POST', { email: 'float@test.invalid', password: 'FloatSmokePw42', name: '浮卡验证' });
  token = registration.token;
  await api('/settings/onboarding-complete', 'PUT', {});
  const course = await api('/courses', 'POST', { name: '浮卡隔离验证' });
  const first = await api('/notes', 'POST', { course_id: course.id, title: '阅读札记', page_format: 'screen_note', skin: { preset: 'warm-paper' } });
  const second = await api('/notes', 'POST', { course_id: course.id, title: '研究札记', page_format: 'screen_note', skin: { preset: 'quiet-ink' } });
  const color = await api('/palette-colors', 'POST', { name: '阅读/蓝', value: '#315D83', sort: 1000 });
  const paths = [];
  vite = await createServer({ configFile: path.join(repo, 'client/vite.config.ts'), root: path.join(repo, 'client'), envDir,
    plugins: [{ name: 'synthetic-floatcard-evidence', configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/__floatcard-evidence') {
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ first: await api(`/notes/${first.id}`), second: await api(`/notes/${second.id}`), suites: await api('/skin-suites'), colors: await api('/palette-colors'), requests: paths })); return;
        }
        if (req.url?.startsWith('/api/')) paths.push({ method: req.method, path: req.url.split('?')[0] });
        next();
      });
    } }], server: { host: '127.0.0.1', port: 5196, strictPort: true, hmr: false, proxy: { '/api': { target: apiOrigin, changeOrigin: true } } } });
  await vite.listen();
  const receipt = { run: path.relative(repo, run), appOrigin, login: 'float@test.invalid', password: 'FloatSmokePw42', firstId: first.id, secondId: second.id, colorId: color.id, firstUrl: `${appOrigin}/#/notes/${first.id}`, secondUrl: `${appOrigin}/#/notes/${second.id}`, isolation: 'Fresh SQLite/assets/app-data; empty dotenv; no user database or provider keys' };
  await writeFile(path.join(evidence, 'smoke-fixture.json'), JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify(receipt));
  process.on('SIGINT', () => { void stop().then(() => process.exit()); });
  process.on('SIGTERM', () => { void stop().then(() => process.exit()); });
} catch (error) { await stop(); throw error; }
