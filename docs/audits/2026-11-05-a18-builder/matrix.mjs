// A-18 key matrix against a scratch server and client only. Real Chrome, real CDP key events, new note per sample.
// usage: node matrix.mjs <clientUrl> <out.json> <rounds> <latencyMs> [armFilter] [port]
import fs from 'node:fs';
import { spawn } from 'node:child_process';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const [CLIENT, OUT, ROUNDS = '1', LATENCY = '0', FILTER = '', PORT = '3001'] = process.argv.slice(2);
const API = `http://127.0.0.1:${PORT}/api`;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const email = 'a18@example.test';
const password = process.env.A18_SCRATCH_PASSWORD; // 本地临时后端的临时账号口令;明文已于 2026-11-08 从仓库移除,运行前自行设置
const json = { 'Content-Type': 'application/json' };
let res = await fetch(`${API}/auth/register`, { method: 'POST', headers: json, body: JSON.stringify({ email, password, name: 'A18' }) });
if (!res.ok) res = await fetch(`${API}/auth/login`, { method: 'POST', headers: json, body: JSON.stringify({ email, password }) });
const login = await res.json();
const token = login.token ?? login.accessToken;
const auth = { Authorization: `Bearer ${token}`, ...json };
await fetch(`${API}/settings/onboarding-complete`, { method: 'PUT', headers: auth });
const courses = await (await fetch(`${API}/courses`, { headers: auth })).json();
const course = courses.find((c) => c.name === 'A18') ?? await (await fetch(`${API}/courses`, { method: 'POST', headers: auth, body: JSON.stringify({ name: 'A18' }) })).json();
const newNote = async (title) => (await (await fetch(`${API}/notes`, { method: 'POST', headers: auth, body: JSON.stringify({ course_id: course.id, title }) })).json()).id;
const serverUnits = async (id) => {
  const r = await (await fetch(`${API}/notes/${id}/blocks`, { headers: auth })).json();
  const list = Array.isArray(r) ? r : (r.blocks || []);
  return list.sort((a, b) => a.order_index - b.order_index).flatMap((b) => (b.content_json?.text_flow?.units || []).map((u) => `${u.writing_role === 'paragraph' ? '' : `[${u.writing_role}]`}${u.text}`));
};

const debugPort = 9300 + Math.floor(Math.random() * 400);
const profile = `${process.env.TEMP}/a18-profile-${debugPort}`;
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`, '--window-size=1440,1000', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
let target;
for (let i = 0; i < 150 && !target; i += 1) {
  try { target = (await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json()).find((t) => t.type === 'page'); } catch { /* not up yet */ }
  if (!target) await sleep(200);
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let seq = 0;
const pending = new Map();
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const cdp = (method, params = {}) => new Promise((r) => { const i = ++seq; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expression) => (await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result?.result?.value;
await cdp('Page.enable'); await cdp('Runtime.enable'); await cdp('Network.enable');
await cdp('Emulation.setFocusEmulationEnabled', { enabled: true });
await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
if (process.env.CPU) await cdp('Emulation.setCPUThrottlingRate', { rate: Number(process.env.CPU) });
if (Number(LATENCY)) await cdp('Network.emulateNetworkConditions', { offline: false, latency: Number(LATENCY), downloadThroughput: -1, uploadThroughput: -1 });
await cdp('Page.navigate', { url: `${CLIENT}/#/login` });
await sleep(2500);
await ev(`localStorage.setItem('coincides_auth_token', ${JSON.stringify(token)}); 1`);

const key = async (k, code, vk, text) => {
  await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, ...(text ? { text } : {}) });
  await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
};
const enter = () => key('Enter', 'Enter', 13, '\r');
const letter = (c) => key(c, `Key${c.toUpperCase()}`, c.toUpperCase().charCodeAt(0), c);
const typeKeys = async (s, gap = 25) => { for (const c of s) { await letter(c); await sleep(gap); } };
const ins = (s) => cdp('Input.insertText', { text: s });
const hash = async () => { await key('#', 'Digit3', 51, '#'); await sleep(30); await key(' ', 'Space', 32, ' '); await sleep(120); };
const textareas = () => ev(`[...document.querySelectorAll('textarea[data-text-unit-id]')].filter(t=>getComputedStyle(t).visibility==='visible'&&t.getBoundingClientRect().width>0).sort((a,b)=>a.getBoundingClientRect().top-b.getBoundingClientRect().top).map(t=>t.value)`);
const open = async (id) => {
  await cdp('Page.navigate', { url: `${CLIENT}/?r=${Date.now()}#/notes/${id}` });
  const started = Date.now();
  for (;;) {
    const ready = await ev(`/Double-click to start writing/.test(document.querySelector('main')?.innerText||'') || document.querySelectorAll('textarea[data-text-unit-id]').length>0`).catch(() => false);
    if (ready) break;
    if (Date.now() - started > 20000) throw new Error('note did not open');
    await sleep(150);
  }
  await sleep(500);
  const n = await ev(`document.querySelectorAll('textarea[data-text-unit-id]').length`);
  if (!n) {
    await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 700, y: 620 });
    for (const clickCount of [1, 2]) {
      await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x: 700, y: 620, button: 'left', buttons: 1, clickCount });
      await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 700, y: 620, button: 'left', buttons: 0, clickCount });
    }
    await sleep(500);
  }
};
const flatten = (rows) => rows.flatMap((t) => t.split('\n')).filter((t, i, all) => t !== '' || i < all.length - 1);

const ARMS = [];
for (const gap of [0, 60, 120, 180, 220, 260, 300, 340, 400, 500]) {
  ARMS.push({ name: `keys@${gap}`, expected: ['abcdef', 'xy'], run: async () => { await typeKeys('abcdef'); await sleep(gap); await enter(); await sleep(25); await typeKeys('xy'); } });
}
for (const gap of [150, 200, 250, 280, 300, 320, 350, 400]) {
  ARMS.push({ name: `ime@${gap}`, expected: ['第一段甲乙丙', '第二行'], run: async () => { await ins('第一段甲乙丙'); await sleep(gap); await enter(); await sleep(25); await ins('第二行'); } });
}
for (const gap of [50, 150, 300]) {
  ARMS.push({ name: `chars@${gap}`, expected: ['第一段甲乙丙', '第二行'], run: async () => { for (const c of '第一段甲乙丙') { await ins(c); await sleep(20); } await sleep(gap); await enter(); await sleep(25); await ins('第二行'); } });
}
for (const gap of [150, 300, 800]) {
  ARMS.push({ name: `hash@${gap}`, expected: ['第一段', '[heading_1]标题甲'], domExpected: ['第一段', '标题甲'], run: async () => { await ins('第一段'); await sleep(gap); await enter(); await sleep(40); await hash(); await ins('标题甲'); } });
}
for (const gap of [150, 300]) {
  ARMS.push({ name: `hashEnter@${gap}`, expected: ['第一段', '# 标题甲', '正文'], accept: [['第一段', '[heading_1]标题甲', '正文']], domExpected: ['第一段', '# 标题甲', '正文'], run: async () => { await ins('第一段'); await enter(); await sleep(40); await hash(); await ins('标题甲'); await sleep(gap); await enter(); await sleep(40); await ins('正文'); } });
}
ARMS.push({ name: 'settled', expected: ['warmup', 'abcdef', 'xy'], run: async () => { await typeKeys('warmup'); await sleep(4000); await enter(); await sleep(800); await typeKeys('abcdef'); await sleep(200); await enter(); await sleep(25); await typeKeys('xy'); } });

for (const gap of [120, 220, 260, 300, 340, 400]) {
  ARMS.push({ name: `slow@${gap}`, expected: ['abcdef', 'xy'], run: async () => { await typeKeys('abcdef', 90); await sleep(gap); await enter(); await sleep(60); await typeKeys('xy', 90); } });
}
for (let gap = 200; gap <= 500; gap += 15) {
  ARMS.push({ name: `fine@${gap}`, expected: ['第一段甲乙丙', '第二行'], run: async () => { await ins('第一段甲乙丙'); await sleep(gap); await enter(); await sleep(25); await ins('第二行'); } });
}
for (const after of [80, 120, 150, 200, 300]) {
  for (const gap of [150, 250, 300, 350]) {
    ARMS.push({ name: `pause${after}@${gap}`, expected: ['第一段甲乙丙', '第二行'], run: async () => { await ins('第一段甲乙丙'); await sleep(gap); await enter(); await sleep(after); await ins('第二行'); } });
  }
  for (const gap of [120, 220, 300, 400]) {
    ARMS.push({ name: `kpause${after}@${gap}`, expected: ['abcdef', 'xy'], run: async () => { await typeKeys('abcdef', 90); await sleep(gap); await enter(); await sleep(after); await typeKeys('xy', 90); } });
  }
}
ARMS.push({ name: 'midHash', expected: ['aaa', '[heading_1]bbb', 'ccc'], domExpected: ['aaa', 'bbb', 'ccc'], run: async () => {
  await typeKeys('aaa'); await sleep(2500); await enter(); await sleep(600); await typeKeys('bbb'); await sleep(600); await enter(); await sleep(600); await typeKeys('ccc'); await sleep(1500);
  await key('ArrowUp', 'ArrowUp', 38); await sleep(300); await key('Home', 'Home', 36); await sleep(300); await hash(); } });
const results = [];
const rounds = Number(ROUNDS);
for (let round = 0; round < rounds; round += 1) {
  for (const arm of ARMS) {
    if (FILTER && !arm.name.match(new RegExp(FILTER))) continue;
    const id = await newNote(`A18 ${arm.name} ${round}`);
    await open(id);
    await arm.run();
    await sleep(Number(process.env.SETTLE ?? 2200));
    // Leave the block so every pending save flushes.
    await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x: 1400, y: 300, button: 'left', buttons: 1, clickCount: 1 });
    await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 1400, y: 300, button: 'left', buttons: 0, clickCount: 1 });
    await sleep(1800);
    const dom = flatten(await textareas());
    const server = (await serverUnits(id)).filter((t, i, all) => t !== '' || i < all.length - 1);
    const domExpected = arm.domExpected ?? arm.expected;
    const ok = (JSON.stringify(dom) === JSON.stringify(domExpected) && JSON.stringify(server) === JSON.stringify(arm.expected))
      || (arm.accept ?? []).some((alt) => JSON.stringify(server) === JSON.stringify(alt) && JSON.stringify(dom) === JSON.stringify(alt.map((t) => t.replace(/^\[[^\]]+\]/, ''))));
    results.push({ arm: arm.name, round, ok, dom, server, note: id });
    if (!ok) console.log('BAD', arm.name, round, JSON.stringify({ dom, server }));
    fs.writeFileSync(OUT, JSON.stringify(results, null, 0));
  }
}
const byArm = {};
for (const r of results) { (byArm[r.arm] ??= { n: 0, bad: 0 }); byArm[r.arm].n += 1; if (!r.ok) byArm[r.arm].bad += 1; }
const bad = results.filter((r) => !r.ok).length;
console.log(JSON.stringify({ total: results.length, bad, latency: Number(LATENCY), byArm }));
await Promise.race([cdp('Browser.close'), sleep(1500)]);
chrome.kill();
process.exit(0);
