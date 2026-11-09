// A-20 survey probes (scratch only). Real headless Chrome, CDP key events, a fresh note pair per sample.
// usage: A20_PASS=... node probe.mjs <clientUrl> <out.json> <samples> <armRegex>
import fs from 'node:fs';
import { spawn } from 'node:child_process';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const [CLIENT, OUT, SAMPLES = '10', FILTER = '.'] = process.argv.slice(2);
const API = 'http://127.0.0.1:3001/api';
const email = 'a20@example.test'; const password = process.env.A20_PASS;
if (!password) throw new Error('A20_PASS not set');
const json = { 'Content-Type': 'application/json' };
let res = await fetch(`${API}/auth/register`, { method: 'POST', headers: json, body: JSON.stringify({ email, password, name: 'A20' }) });
if (!res.ok) res = await fetch(`${API}/auth/login`, { method: 'POST', headers: json, body: JSON.stringify({ email, password }) });
const login = await res.json(); const token = login.token ?? login.accessToken;
const auth = { Authorization: `Bearer ${token}`, ...json };
await fetch(`${API}/settings/onboarding-complete`, { method: 'PUT', headers: auth });
const courses = await (await fetch(`${API}/courses`, { headers: auth })).json();
const course = courses.find((c) => c.name === 'A20') ?? await (await fetch(`${API}/courses`, { method: 'POST', headers: auth, body: JSON.stringify({ name: 'A20' }) })).json();
const newNote = async (title) => (await (await fetch(`${API}/notes`, { method: 'POST', headers: auth, body: JSON.stringify({ course_id: course.id, title }) })).json()).id;
const serverText = async (id) => {
  const r = await (await fetch(`${API}/notes/${id}/blocks`, { headers: auth })).json();
  const list = Array.isArray(r) ? r : (r.blocks || []);
  return list.sort((a, b) => a.order_index - b.order_index).flatMap((b) => (b.content_json?.text_flow?.units || []).map((u) => u.text)).join('|');
};
const writes = async () => (await fetch(`${CLIENT}/__writes`)).json();
const debugPort = 9300 + Math.floor(Math.random() * 400);
const profile = `<tmp>/a20-profile-${debugPort}`;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`, '--window-size=1440,1000', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
let target;
for (let i = 0; i < 150 && !target; i += 1) { try { target = (await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json()).find((t) => t.type === 'page'); } catch { /* starting */ } if (!target) await sleep(200); }
const ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise((r) => ws.addEventListener('open', r));
let seq = 0; const pending = new Map(); const consoleLines = [];
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
  if (m.method === 'Runtime.consoleAPICalled') consoleLines.push(`${m.params.type}: ${(m.params.args || []).map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 300)}`); });
const cdp = (method, params = {}) => new Promise((r) => { const i = ++seq; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expression) => (await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result?.result?.value;
await cdp('Page.enable'); await cdp('Runtime.enable');
await cdp('Emulation.setFocusEmulationEnabled', { enabled: true });
await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
await cdp('Page.navigate', { url: `${CLIENT}/#/login` }); await sleep(2500);
const setAuth = () => ev(`localStorage.setItem('coincides_auth_token', ${JSON.stringify(token)}); 1`);
await setAuth();
const key = async (k, code, vk, text) => {
  await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, ...(text ? { text } : {}) });
  await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
};
const enter = () => key('Enter', 'Enter', 13, '\r');
const letter = (c) => (c === ' ' ? key(' ', 'Space', 32, ' ') : key(c, `Key${c.toUpperCase()}`, c.toUpperCase().charCodeAt(0), c));
const typeKeys = async (s, gap = 60) => { for (const c of s) { await letter(c); await sleep(gap); } };
const waitOpen = async () => { const t = Date.now(); for (;;) {
  if (await ev(`/Double-click to start writing/.test(document.querySelector('main')?.innerText||'') || document.querySelectorAll('textarea[data-text-unit-id]').length>0`).catch(() => false)) break;
  if (Date.now() - t > 20000) throw new Error('note did not open'); await sleep(150); } await sleep(500); };
const startWriting = async () => { if (await ev(`document.querySelectorAll('textarea[data-text-unit-id]').length`)) return;
  await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 700, y: 620 });
  for (const clickCount of [1, 2]) { await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x: 700, y: 620, button: 'left', buttons: 1, clickCount }); await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 700, y: 620, button: 'left', buttons: 0, clickCount }); }
  await sleep(500); };
const open = async (id) => { await cdp('Page.navigate', { url: `${CLIENT}/?r=${Date.now()}#/notes/${id}` }); await waitOpen(); };
const toast = () => ev(`(document.body.innerText.match(/[^\n]*could not be saved[^\n]*/g)||[]).join(' / ')`);
const onScreen = (w) => ev(`[...document.querySelectorAll('textarea')].some(t=>t.value.includes(${JSON.stringify(w)}))`);
// Persistent editor: the first block has landed and 'warmup' is on the server.
const persistent = async () => { await startWriting(); await typeKeys('warmup'); await sleep(2500); await enter(); await sleep(1500); };
const clickOut = () => ev(`(()=>{const t=[...document.querySelectorAll('a')].find(a=>/projects|tool-receipts|boards/.test(a.getAttribute('href')||''));if(!t)return 'NONE';t.click();return t.getAttribute('href')})()`);
const ARMS = {
  // Q2 / Q3: type without Enter, leave four ways. 'kept' on the server = not lost.
  hashSwitch: async (a, b) => { await persistent(); await typeKeys('kept'); await sleep(300); return ev(`location.hash='#/notes/${b}';1`); },
  pasteLink: async (a, b) => { await persistent(); await typeKeys('kept'); await sleep(300); const href = await ev('location.href'); return cdp('Page.navigate', { url: href.replace(/#.*$/, `#/notes/${b}`) }); },
  loginHash: async () => { await persistent(); await typeKeys('kept'); await sleep(300); return ev(`localStorage.removeItem('coincides_auth_token');location.hash='#/login';1`); },
  login401Enter: async () => { await persistent(); await typeKeys('kept'); await sleep(300); await fetch(`${CLIENT}/__mode/401`); await enter(); },
  clickLeave: async () => { await persistent(); await typeKeys('kept'); await sleep(300); return clickOut(); },
  // B-81 on notes with nothing typed: open A, switch to B.
  emptyHash: async (a, b) => { await sleep(800); return ev(`location.hash='#/notes/${b}';1`); },
  emptyPaste: async (a, b) => { await sleep(800); const href = await ev('location.href'); return cdp('Page.navigate', { url: href.replace(/#.*$/, `#/notes/${b}`) }); },
  emptyClick: async () => { await sleep(800); return clickOut(); },
};
const rows = [];
for (const [name, run] of Object.entries(ARMS)) {
  if (!new RegExp(FILTER).test(name)) continue;
  for (let i = 0; i < Number(SAMPLES); i += 1) {
    const a = await newNote(`A20 ${name} ${i}`); const b = await newNote(`A20 other ${i}`);
    await fetch(`${CLIENT}/__mode/off`); await setAuth(); await open(a);
    consoleLines.length = 0;
    await ev(`window.__seen=[];new MutationObserver(()=>{for(const e of document.querySelectorAll('span')){const x=e.textContent||'';if(x.includes('could not be saved')&&!window.__seen.includes(x))window.__seen.push(x)}}).observe(document.body,{subtree:true,childList:true,characterData:true});1`);
    await fetch(`${CLIENT}/__writes/reset`);
    let t0 = 0;
    let err = null;
    try { await run(a, b); t0 = Date.now(); } catch (e) { err = String(e).slice(0, 200); t0 = Date.now(); }
    const typedWrites = (await writes()).filter((w) => w.t < t0).length;
    let shownToast = '';
    for (const end = Date.now() + 3500; Date.now() < end;) { const t = await toast().catch(() => ''); if (t && !shownToast) shownToast = t; await sleep(100); }
    const after = (await writes()).filter((w) => w.t >= t0).map((w) => `${w.m} ${w.u}`);
    const seen = await ev('JSON.stringify(window.__seen||null)').catch(() => 'n/a'); if (!shownToast && seen && seen !== '[]') shownToast = 'observer:' + seen;
    const errors = consoleLines.filter((l) => /^error|^warning/.test(l)).map((l) => l.slice(0, 160));
    const hash = String(await ev('location.hash'));
    await fetch(`${CLIENT}/__mode/off`);
    const server = await serverText(a);
    const kept = server.includes('kept');
    let reopened = null; let banner = null; let stored = null;
    if (/^(hash|paste|login)/.test(name)) { await setAuth(); await open(a); await sleep(800); reopened = await onScreen('kept'); banner = await ev(`document.body.innerText.includes('waiting for recovery')`); stored = await ev(`(sessionStorage.getItem('coincides:draft-recovery:v2')||'').includes('kept')`); }
    const routerWarning = consoleLines.some((l) => /blocker on a POP navigation/.test(l));
    const row = { arm: name, i, server, kept, reopenedOnScreen: reopened, bannerAfterReopen: banner, receiptInSessionStorage: stored, toast: shownToast, hash: hash.replace(/[0-9a-f-]{36}/g, ':id'),
      typedWrites, writesAfterLeave: after, routerWarning, err, console: errors };
    rows.push(row); console.log(JSON.stringify(row));
  }
}
const sum = {};
for (const r of rows) {
  const s = sum[r.arm] ??= { n: 0, kept: 0, toast: 0, routerWarning: 0, writesAfter: 0, reopened: 0 };
  s.n += 1; s.kept += r.kept ? 1 : 0; s.toast += r.toast ? 1 : 0; s.routerWarning += r.routerWarning ? 1 : 0;
  s.writesAfter += r.writesAfterLeave.length; s.reopened += r.reopenedOnScreen ? 1 : 0;
}
fs.writeFileSync(OUT, JSON.stringify({ client: CLIENT, rows, sum }, null, 1));
console.log('SUMMARY', JSON.stringify(sum));
ws.close(); chrome.kill();
