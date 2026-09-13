// Actual application + actual API, with a new SQLite database and Chrome profile per run.
// Run: node client/scripts/paletteSmoke/verify.mjs [optional Chrome executable] [--isolated-chrome-no-sandbox]
// No user profile, user database, dotenv values, or application build artifacts are used.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const repo = fileURLToPath(new URL('../../../', import.meta.url));
const clientRoot = path.join(repo, 'client');
const base = path.join(repo, '.tmp/palette-validation/smoke');
const evidence = path.join(repo, 'docs/audits/2026-09-13-palette-builder');
await mkdir(base, { recursive: true });
await mkdir(evidence, { recursive: true });
const run = await mkdtemp(path.join(base, 'run-'));
const profile = path.join(run, 'chrome');
const envDir = path.join(run, 'empty-env');
const emptyDotenv = path.join(envDir, 'synthetic.env');
await mkdir(profile);
await mkdir(envDir);
await writeFile(emptyDotenv, '');
const apiOrigin = 'http://127.0.0.1:5197';
const appOrigin = 'http://127.0.0.1:5198';
const noBrowserSandbox = process.argv.includes('--isolated-chrome-no-sandbox');
const browserExecutable = process.argv.slice(2).find((argument) => !argument.startsWith('--')) || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const inherited = Object.fromEntries(['SystemRoot', 'PATH', 'Path', 'TEMP', 'TMP'].flatMap((key) => process.env[key] ? [[key, process.env[key]]] : []));
const serverEnv = {
  ...inherited, NODE_ENV: 'test', PORT: '5197', DOTENV_CONFIG_PATH: emptyDotenv,
  JWT_SECRET: 'palette-smoke-synthetic-secret', DB_PATH: path.join(run, 'synthetic.sqlite'),
  CANVAS_ASSET_DIR: path.join(run, 'canvas-assets'), SOURCE_BLOB_DIR: path.join(run, 'source-blobs'),
  UPLOAD_DIR: path.join(run, 'uploads'), COINCIDES_APP_DATA_DIR: path.join(run, 'app-data'),
};
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let backend, chrome, vite, socket;
let backendLog = '', chromeLog = '', token = '', counter = 0;
const pending = new Map();
const errors = [], requests = [], responses = [], screenshots = [];
const receipt = { run: path.relative(repo, run), isolation: { database: 'fresh per run', profile: 'fresh per run', dotenv: 'synthetic empty file', sandbox: noBrowserSandbox ? 'isolated Chrome test-harness --no-sandbox; tool/filesystem sandbox unchanged' : 'enabled' }, checks: [], screenshots, requests, responses, errors };
function pass(name, data = {}) { receipt.checks.push({ name, ...data }); console.log(`PASS ${name}`); }
function call(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++counter;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 15000);
    pending.set(id, { resolve, reject, timer }); socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}
async function until(expression) {
  for (let attempt = 0; attempt < 200; attempt++) { if (await evaluate(expression)) return; await delay(100); }
  throw new Error(`Timed out: ${expression}`);
}
async function api(url, method = 'GET', body) {
  const result = await fetch(`${apiOrigin}/api${url}`, { method, headers: {
    'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}),
  }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const data = await result.json();
  assert.ok(result.ok, `${method} ${url}: ${result.status} ${JSON.stringify(data)}`);
  return data;
}
async function apiUntil(url, predicate) {
  for (let attempt = 0; attempt < 100; attempt++) { const value = await api(url); if (predicate(value)) return value; await delay(100); }
  throw new Error(`Persisted state did not settle: ${url}`);
}
async function screenshot(name) {
  const shot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  const file = `smoke-${name}.png`;
  await writeFile(path.join(evidence, file), Buffer.from(shot.data, 'base64')); screenshots.push(file);
}
// Production DOM identifies the control; input is delivered by Chrome hit testing, never element.click().
async function clickNode(expression) {
  await evaluate(`(${expression})?.scrollIntoView({block:'center',inline:'nearest'})`);
  // Portal placement also reacts to scrolling; wait for that placement before hit testing.
  await delay(150);
  const point = await evaluate(`(()=>{const node=${expression}; if(!node || node.disabled) return null; const r=node.getBoundingClientRect();const x=r.x+r.width/2,y=r.y+r.height/2;const hit=document.elementFromPoint(x,y);return hit && (hit===node || node.contains(hit))?{x,y}:null;})()`);
  assert.ok(point, `enabled control ${expression}`);
  await call('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point });
  await call('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point });
  await delay(180);
}
const node = (selector) => `document.querySelector(${JSON.stringify(selector)})`;
const click = (selector) => clickNode(node(selector));
const button = (text) => clickNode(`[...document.querySelectorAll('[role="dialog"] button')].find(n=>n.textContent.trim()===${JSON.stringify(text)})`);
async function openPicker() {
  await until(`document.querySelector('button[aria-label="纸面"]')?.disabled===false`);
  if (!await evaluate(`Boolean(document.querySelector('[role="dialog"][aria-label="纸面颜色"]'))`)) await click('button[aria-label="纸面"]');
}
async function key(key, code, virtualKey, modifiers = 0) {
  await call('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: virtualKey, modifiers });
  await call('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: virtualKey, modifiers });
}
async function fill(selector, text, commit = false) {
  await click(selector); await key('a', 'KeyA', 65, 2); await call('Input.insertText', { text });
  if (commit) await key('Enter', 'Enter', 13);
  await delay(180);
}
const paper = () => evaluate(`getComputedStyle(document.querySelector('[data-note-skin-preset]')).getPropertyValue('--sk-paper').trim()`);
async function connect(url) {
  socket = new WebSocket(url);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    if (message.method === 'Network.requestWillBeSent' && message.params.request.url.startsWith(`${appOrigin}/api/`)) {
      const { method, url } = message.params.request;
      requests.push({ method, path: new URL(url).pathname });
    }
    if (message.method === 'Network.responseReceived' && message.params.response.url.startsWith(`${appOrigin}/api/`)) {
      const { url, status } = message.params.response; responses.push({ path: new URL(url).pathname, status });
    }
    const entry = pending.get(message.id); if (!entry) return;
    clearTimeout(entry.timer); pending.delete(message.id);
    message.error ? entry.reject(new Error(message.error.message)) : entry.resolve(message.result);
  };
}

try {
  backend = spawn(process.execPath, ['--import', 'tsx', 'src/index.ts'], { cwd: path.join(repo, 'server'), env: serverEnv, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  backend.stdout.on('data', (chunk) => { backendLog += chunk; }); backend.stderr.on('data', (chunk) => { backendLog += chunk; });
  backend.on('error', (error) => { backendLog += error.message; });
  let healthy = false;
  for (let attempt = 0; attempt < 150; attempt++) {
    if (backend.exitCode !== null) throw new Error(`Isolated backend exited ${backend.exitCode}: ${backendLog}`);
    // A successful response from a pre-existing process is not proof of isolation.
    if (backendLog.includes('Coincides server running on http://0.0.0.0:5197')) {
      try { healthy = (await fetch(`${apiOrigin}/api/health`)).ok; } catch { /* startup */ }
    }
    if (healthy) break; await delay(100);
  }
  assert.ok(healthy, 'isolated backend started');
  const registration = await api('/auth/register', 'POST', { email: 'palette-smoke@example.invalid', password: 'SyntheticPalettePassword42', name: 'Palette smoke' });
  token = registration.token;
  await api('/settings/onboarding-complete', 'PUT', {});
  const course = await api('/courses', 'POST', { name: 'Palette smoke project' });
  const note = await api('/notes', 'POST', { course_id: course.id, title: 'Palette smoke paper', page_format: 'screen_note', skin: { preset: 'warm-paper' } });
  const factory = await api('/palette-colors');
  assert.equal(factory.length, 24); assert.ok(factory.every((entry) => entry.origin === 'factory'));
  const color = await api('/palette-colors', 'POST', { name: '验证/纸色', value: '#D3E4F5', sort: 9999 });
  pass('actual migration and registration seed', { factoryCount: factory.length, noteId: note.id });
  vite = await createServer({ configFile: path.join(clientRoot, 'vite.config.ts'), root: clientRoot, envDir, server: {
    host: '127.0.0.1', port: 5198, strictPort: true, hmr: false, proxy: { '/api': { target: apiOrigin, changeOrigin: true } },
  } });
  await vite.listen();
  chrome = spawn(browserExecutable, [
    '--headless=new', '--disable-gpu', '--in-process-gpu', '--disable-background-networking', '--disable-sync',
    '--disable-extensions', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0',
    ...(noBrowserSandbox ? ['--no-sandbox'] : []), `--user-data-dir=${profile}`, 'about:blank',
  ], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
  chrome.stderr.on('data', (chunk) => { chromeLog += chunk; });
  let endpoint;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (chrome.exitCode !== null) throw new Error(`Isolated Chrome exited ${chrome.exitCode}: ${chromeLog}`);
    try { const [port, route] = (await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).trim().split(/\r?\n/); endpoint = `ws://127.0.0.1:${port}${route}`; break; } catch { await delay(100); }
  }
  assert.ok(endpoint, 'isolated Chrome started');
  await connect(endpoint);
  const target = await call('Target.createTarget', { url: 'about:blank' });
  const targets = await (await fetch(endpoint.replace('ws:', 'http:').replace(/\/devtools\/browser\/.+$/, '/json/list'))).json();
  socket.close(); await connect(targets.find((entry) => entry.id === target.targetId).webSocketDebuggerUrl);
  await call('Runtime.enable'); await call('Page.enable'); await call('Network.enable');
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await call('Page.addScriptToEvaluateOnNewDocument', { source: `if(location.origin===${JSON.stringify(appOrigin)})localStorage.setItem('coincides_auth_token',${JSON.stringify(token)});` });
  await call('Page.navigate', { url: `${appOrigin}/#/notes/${note.id}` });
  await until('Boolean(document.querySelector(\'[aria-label="笔记外观"]\'))');
  await screenshot('paper-before');
  await click('[aria-label="笔记外观"]');
  await click('[data-paper-appearance] > summary');
  await clickNode(`[...document.querySelectorAll('[data-paper-appearance] summary')].find(n=>n.textContent.trim()==='高级颜色')`);
  await click('button[aria-label="纸面"]');
  await until('Boolean(document.querySelector(\'[role="dialog"][aria-label="纸面颜色"]\'))');
  await screenshot('four-sections');
  const headings = await evaluate(`[...document.querySelectorAll('[role="dialog"] h3')].map(n=>n.textContent)`);
  assert.deepEqual(headings, ['调色板', '标准色', '最近使用', '自由取色']);
  pass('unified picker renders all four sections', { headings });
  await click('button[aria-label="验证/纸色 #D3E4F5"]');
  await apiUntil(`/notes/${note.id}`, (entry) => entry.metadata?.skin?.overrides?.paper === `palette:${color.id}`);
  assert.equal(await paper(), '#D3E4F5'); await screenshot('reference-bound');
  pass('pool click persists reference and colors paper', { reference: `palette:${color.id}`, paper: await paper() });
  await openPicker();
  await button('编辑');
  await fill('input[aria-label="验证/纸色 Hex"]', '#AbCDef88', true);
  await apiUntil('/palette-colors', (entries) => entries.some((entry) => entry.id === color.id && entry.value === '#AbCDef88'));
  await until(`getComputedStyle(document.querySelector('[data-note-skin-preset]')).getPropertyValue('--sk-paper').trim()==='#AbCDef88'`);
  const beforeDelete = await paper(); await screenshot('reference-edited');
  pass('editing pool hex updates live paper', { paper: beforeDelete });
  await click('button[aria-label="删除验证/纸色"]');
  await apiUntil('/palette-colors', (entries) => !entries.some((entry) => entry.id === color.id));
  const afterDeleteNote = await apiUntil(`/notes/${note.id}`, (entry) => entry.metadata?.skin?.overrides?.paper === beforeDelete);
  assert.equal(await paper(), beforeDelete); await screenshot('reference-detached');
  pass('delete detaches without changing exact resolved bytes', { beforeDelete, afterDelete: await paper(), persisted: afterDeleteNote.metadata.skin.overrides.paper });
  await openPicker();
  await button('完成编辑');
  await click('button[aria-label="标准色 蓝 #4A6FA5"]');
  await apiUntil(`/notes/${note.id}`, (entry) => entry.metadata?.skin?.overrides?.paper === '#4A6FA5');
  assert.equal(await paper(), '#4A6FA5'); await screenshot('standard-literal');
  pass('standard swatch persists an absolute color', { value: '#4A6FA5' });
  await openPicker();
  await click('button[aria-label="把当前颜色入池"]');
  await fill('input[aria-label="新颜色名称"]', '验证/Hex新色');
  await fill('input[aria-label="新颜色 Hex"]', '#B1C2D3');
  await button('加入并使用');
  const hexCreated = (await apiUntil('/palette-colors', (entries) => entries.some((entry) => entry.name === '验证/Hex新色'))).find((entry) => entry.name === '验证/Hex新色');
  assert.equal(hexCreated.value, '#B1C2D3');
  await apiUntil(`/notes/${note.id}`, (entry) => entry.metadata?.skin?.overrides?.paper === `palette:${hexCreated.id}`);
  await screenshot('hex-created'); pass('add form accepts an independent hex value', { name: hexCreated.name, value: hexCreated.value });
  await openPicker();
  await button('完成编辑');
  await fill('input[aria-label="Hex 颜色"]', '#C6D7E8');
  await apiUntil(`/notes/${note.id}`, (entry) => entry.metadata?.skin?.overrides?.paper === '#C6D7E8');
  await openPicker();
  await click('button[aria-label="把当前颜色入池"]');
  assert.equal(await evaluate(`document.querySelector('input[aria-label="新颜色 Hex"]').value`), '#C6D7E8');
  await fill('input[aria-label="新颜色名称"]', '验证/入池');
  await button('加入并使用');
  const added = (await apiUntil('/palette-colors', (entries) => entries.some((entry) => entry.name === '验证/入池'))).find((entry) => entry.name === '验证/入池');
  assert.equal(added.value, '#C6D7E8');
  await apiUntil(`/notes/${note.id}`, (entry) => entry.metadata?.skin?.overrides?.paper === `palette:${added.id}`);
  await screenshot('hex-added'); pass('free hex and current-color add create named pool reference', { added });
  await openPicker();
  await button('完成编辑');
  await clickNode(`[...document.querySelectorAll('[role="dialog"] button[aria-expanded]')].find(n=>n.querySelector('span')?.textContent==='验证')`);
  assert.equal(await evaluate(`Boolean(document.querySelector('button[aria-label="验证/入池 #C6D7E8"]'))`), false);
  await screenshot('group-collapsed'); pass('slash prefix group collapses');
  await key('Escape', 'Escape', 27);
  assert.equal(await evaluate(`document.querySelector('[role="dialog"][aria-label="纸面颜色"]')===null`), true);
  assert.equal(await evaluate(`document.activeElement?.getAttribute('aria-label')`), '纸面');
  pass('Escape closes and restores trigger focus');
  await openPicker();
  await call('Emulation.setDeviceMetricsOverride', { width: 360, height: 740, deviceScaleFactor: 1, mobile: false });
  await delay(250);
  const bounds = await evaluate(`(()=>{const r=document.querySelector('[role="dialog"][aria-label="纸面颜色"]').getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};})()`);
  assert.ok(bounds.left >= 0 && bounds.right <= 360 && bounds.top >= 0 && bounds.bottom <= 740, JSON.stringify(bounds));
  await screenshot('narrow-viewport'); pass('open picker responds to 360px viewport', { bounds });
  await key('Escape', 'Escape', 27);
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  const previousTimeOrigin = await evaluate('performance.timeOrigin');
  await call('Page.reload');
  await until(`performance.timeOrigin > ${previousTimeOrigin} && document.readyState==='complete' && document.querySelector('[data-note-skin-preset]') && getComputedStyle(document.querySelector('[data-note-skin-preset]')).getPropertyValue('--sk-paper').trim()==='#C6D7E8'`);
  await delay(250);
  await screenshot('reloaded'); pass('reference resolves after actual page reload');
  assert.deepEqual(errors, [], 'no browser runtime exceptions');
  assert.deepEqual(responses.filter((entry) => entry.status >= 400), [], 'all application API responses succeed');
  pass('browser runtime and application request ledger clean');
  receipt.status = 'passed';
} catch (error) {
  receipt.status = 'failed'; errors.push(String(error));
  await screenshot('failure').catch(() => undefined);
  receipt.failurePage = await evaluate('document.body.innerText').catch(() => null);
  console.error(error); process.exitCode = 1;
} finally {
  await writeFile(path.join(evidence, 'smoke-receipts.json'), JSON.stringify(receipt, null, 2) + '\n');
  await writeFile(path.join(run, 'server.log'), backendLog);
  await writeFile(path.join(run, 'chrome.log'), chromeLog);
  if (socket?.readyState === 1) { await call('Browser.close').catch(() => undefined); socket.close(); }
  if (chrome && chrome.exitCode === null) chrome.kill();
  await vite?.close();
  if (backend && backend.exitCode === null) backend.kill();
  console.log(`Palette smoke ${receipt.status}: ${path.join(evidence, 'smoke-receipts.json')}`);
}
