// Run start.mjs first. Uses installed Chrome + Node built-ins; no PDF output or user profile.
// V2 revival: retain the original specimen and assertions; preserve the S3 FAIL receipts.
// --isolated-chrome-no-sandbox is an explicit workaround for this Windows test host only.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const output = fileURLToPath(new URL('../../../.codex-tmp/print-revival/', import.meta.url));
await mkdir(output, { recursive: true });
const profile = await mkdtemp(path.join(output, 'chrome-'));
const executable = process.argv.slice(2).find((argument) => !argument.startsWith('--'));
const chrome = spawn(executable || 'C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--disable-gpu', '--in-process-gpu', '--disable-background-networking', '--disable-sync',
  ...(process.argv.includes('--isolated-chrome-no-sandbox') ? ['--no-sandbox'] : []),
  '--disable-extensions', '--no-first-run', '--no-default-browser-check',
  '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank',
], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
let chromeDiagnostics = '';
chrome.stderr.on('data', (chunk) => { chromeDiagnostics += chunk.toString(); });
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let socket;
let counter = 0;
const pending = new Map();
const errors = [];
function call(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++counter;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 10000);
    pending.set(id, { resolve, reject, timer });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}
async function until(expression) {
  for (let i = 0; i < 100; i++) {
    if (await evaluate(expression)) return;
    await delay(100);
  }
  throw new Error(`Timed out waiting for fixture: ${expression}`);
}
const geometryScript = `JSON.stringify([...document.querySelectorAll('#root article[data-note-block-shell]')].map(e=>({
  style:e.getAttribute('style'), text:[...e.querySelectorAll('textarea')].map(t=>t.value)
})))`;
async function screenshot(name) {
  const shot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await writeFile(path.join(output, name), Buffer.from(shot.data, 'base64'));
}
async function screenshotPages(prefix) {
  const clips = await evaluate(`([...document.querySelectorAll('[data-note-print-page]')].map(page => {
    const r = page.getBoundingClientRect();
    return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:1};
  }))`);
  for (const [index, clip] of clips.entries()) {
    const shot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip });
    await writeFile(path.join(output, `${prefix}-page-${index + 1}.png`), Buffer.from(shot.data, 'base64'));
  }
}
const samples = [];
try {
  let endpoint;
  for (let i = 0; i < 100; i++) {
    try {
      const [port, route] = (await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).trim().split(/\r?\n/);
      endpoint = `ws://127.0.0.1:${port}${route}`;
      break;
    } catch { await delay(100); }
  }
  assert.ok(endpoint, 'isolated Chrome must start');
  socket = new WebSocket(endpoint);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  const onMessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
    const entry = pending.get(message.id);
    if (!entry) return;
    clearTimeout(entry.timer);
    pending.delete(message.id);
    message.error ? entry.reject(new Error(message.error.message)) : entry.resolve(message.result);
  };
  socket.onmessage = onMessage;
  const target = await call('Target.createTarget', { url: 'about:blank' });
  const targets = await (await fetch(endpoint.replace('ws:', 'http:').replace(/\/devtools\/browser\/.+$/, '/json/list'))).json();
  const pageEndpoint = targets.find((item) => item.id === target.targetId).webSocketDebuggerUrl;
  socket.close();
  socket = new WebSocket(pageEndpoint);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  socket.onmessage = onMessage;
  await call('Runtime.enable');
  await call('Page.enable');
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  for (const paper of ['A4', 'Letter', 'web']) {
    await call('Page.navigate', { url: `http://127.0.0.1:5181/scripts/pageReadingSmoke/print.html?paper=${paper}` });
    await until(`document.querySelector('button') && [...document.querySelectorAll('button')].some(b=>b.textContent==='Open browser print preview'&&!b.disabled)`);
    await delay(800);
    assert.equal(await evaluate(`document.querySelectorAll('[data-note-print-root]').length`), 0);
    const before = await evaluate(geometryScript);
    await screenshot(`${paper}-screen.png`);
    for (const gear of ['fit_width', 'physical']) {
      if (gear === 'physical') {
        // Exercise real reading controls before the next print job.
        const point = await evaluate(`(()=>{const e=[...document.querySelectorAll('button')].find(b=>b.textContent==='100% physical');const r=e?.getBoundingClientRect();return r&&{x:r.x+r.width/2,y:r.y+r.height/2};})()`);
        assert.ok(point, 'physical reading control');
        await call('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point });
        await call('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point });
        const step = await evaluate(`(()=>{const r=document.querySelector('[aria-label="Increase page reading step"]').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
        await call('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...step });
        await call('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...step });
        await delay(200);
      }
      await until(`document.querySelector('[data-page-reading-gear]')?.dataset.pageReadingGear === '${gear}'`);
      await until(`Number(document.querySelector('[data-page-reading-step]')?.dataset.pageReadingStep) === ${gear === 'physical' ? 1.1 : 1}`);
      // The second-tier criterion samples the browser's real print CSS media, not a PDF.
      await call('Emulation.setEmulatedMedia', { media: 'print' });
      await until(`document.querySelectorAll('[data-note-print-page]').length===2`);
      await delay(150);
      const receipt = await evaluate(`(()=>{const d=JSON.parse(document.querySelector('[data-print-evidence]').textContent);return [...d.receipts].reverse().find(r=>r.printMedia&&r.pages.length===2);})()`);
      assert.ok(receipt, 'print media receipt must exist');
      samples.push({ paper, gear, receipt });
      await screenshot(`${paper}-${gear}-print.png`);
      await screenshotPages(`${paper}-${gear}`);
      await call('Emulation.setEmulatedMedia', { media: 'screen' });
      await until(`document.querySelectorAll('[data-note-print-root]').length===0`);
      await delay(250);
      const after = await evaluate(geometryScript);
      samples.at(-1).screenGeometryUnchanged = before === after;
    }
  }
  await writeFile(path.join(output, 'receipts.json'), JSON.stringify({ samples, errors }, null, 2));
  for (const sample of samples) {
    console.log(JSON.stringify({ paper: sample.paper, gear: sample.gear, result: sample.receipt.result,
      screenGeometryUnchanged: sample.screenGeometryUnchanged, checks: sample.receipt.checks,
      pages: sample.receipt.pages.map(p=>({ id:p.frameId, width:p.width, height:p.height,scale:p.declaredScale,fragments:p.fragments.length })) }));
    assert.equal(sample.receipt.screenGear, sample.gear, 'receipt must match the requested reading gear');
    assert.equal(sample.receipt.coordinateContract, 'v2', 'receipt must use the production v2 contract');
    assert.equal(sample.receipt.screenStep, sample.gear === 'physical' ? 1.1 : 1);
    assert.equal(sample.receipt.result, 'PASS');
    assert.equal(sample.screenGeometryUnchanged, true, 'printing must preserve screen block geometry');
  }
  for (const paper of ['A4', 'Letter', 'web']) {
    const configurations = samples.filter((sample) => sample.paper === paper);
    assert.deepEqual(configurations[0].receipt.pages, configurations[1].receipt.pages,
      `${paper}: reading gear/step must not alter any print page or fragment geometry`);
  }
  assert.equal(errors.length, 0, 'no browser runtime errors');
  console.log('PASS print-media browser smoke: 3 paper families × 2 reading configurations; zero PDFs');
} finally {
  await writeFile(path.join(output, 'chrome-diagnostics.txt'), chromeDiagnostics);
  if (socket?.readyState === 1) {
    await call('Browser.close').catch(() => undefined);
    socket.close();
  }
  if (chrome.exitCode === null) await new Promise((resolve) => {
    chrome.once('exit', resolve);
    setTimeout(() => { chrome.kill(); resolve(); }, 3000);
  });
  // Delete only the fresh, task-owned profile inside the verified output directory.
  const relative = path.relative(output, profile);
  assert.ok(relative.startsWith('chrome-') && !relative.includes(path.sep) && !path.isAbsolute(relative));
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 150 });
}
