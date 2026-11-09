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
// ---- A-20 Q1 / Q5: undo shape and write counts (scratch only) ----
const ctrlZ = async () => {
  await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'z', code: 'KeyZ', windowsVirtualKeyCode: 90, nativeVirtualKeyCode: 90, modifiers: 2 });
  await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'z', code: 'KeyZ', windowsVirtualKeyCode: 90, nativeVirtualKeyCode: 90, modifiers: 2 });
};
const lines = () => ev(`[...document.querySelectorAll('textarea[data-text-unit-id]')].filter(t=>t.getBoundingClientRect().width>0).sort((a,b)=>a.getBoundingClientRect().top-b.getBoundingClientRect().top).map(t=>t.value).join('|')`);
const undoSteps = async (n) => { const out = [await lines()]; for (let i = 0; i < n; i += 1) { await ctrlZ(); await sleep(1500); out.push(await lines()); } return out; };
const refocusEnd = () => ev(`(()=>{const t=[...document.querySelectorAll('textarea[data-text-unit-id]')].filter(t=>t.getBoundingClientRect().width>0).sort((a,b)=>b.getBoundingClientRect().top-a.getBoundingClientRect().top)[0];t.focus();t.setSelectionRange(t.value.length,t.value.length);return t.value})()`);
const words = 'the quick brown fox jumps over a lazy dog and then rests ';
const typeFor = async (ms, gap) => { const end = Date.now() + ms; let i = 0; while (Date.now() < end) { await letter(words[i % words.length]); i += 1; await sleep(gap); } return i; };
const ime = async (pinyin, han) => {
  for (let k = 1; k <= pinyin.length; k += 1) { await cdp('Input.imeSetComposition', { text: pinyin.slice(0, k), selectionStart: k, selectionEnd: k }); await sleep(40); }
  await cdp('Input.insertText', { text: han });
};
const ARMS = {
  // Baseline: two Enters, then Ctrl+Z four times.
  undoEnter: async () => { await persistent(); await typeKeys('aaa'); await enter(); await sleep(200); await typeKeys('bbb'); await enter(); await sleep(200); await typeKeys('ccc'); await sleep(1500); return { undo: await undoSteps(4) }; },
  // Baseline: a 3 s pause inside one line, no Enter, then Ctrl+Z twice.
  undoPause: async () => { await persistent(); await typeKeys('aaa'); await sleep(3000); await typeKeys('bbb'); await sleep(1500); return { undo: await undoSteps(2) }; },
  // Road (A) stand-in: the idle seal is the same seal the blur uses (useTextFlowHistory.ts:655-660), so blur and come back.
  undoSealA: async () => { await persistent(); await typeKeys('aaa'); await sleep(500); await ev('document.activeElement.blur();1'); await sleep(1500); await refocusEnd(); await sleep(300); await typeKeys('bbb'); await sleep(1500); return { undo: await undoSteps(3) }; },
  // Baseline with an IME: two compositions in one line, then Ctrl+Z twice.
  undoIme: async () => { await persistent(); await ime('xianzhi', '现值'); await sleep(800); await ime('gongshi', '公式'); await sleep(1500); return { undo: await undoSteps(2) }; },
  // Q5: 60 s of typing with no Enter in the persistent editor, then one Enter.
  rate60: async () => { await persistent(); await fetch(`${CLIENT}/__writes/reset`); const keys = await typeFor(60000, 120); const during = await writes(); await enter(); await sleep(2500); const after = await writes();
    return { keys, writesWhileTyping: during.map((w) => `${w.m} ${w.u}`), writesAfterEnter: after.slice(during.length).map((w) => `${w.m} ${w.u}`) }; },
  // Q5: four 3 s pauses, no Enter.
  rate4pauses: async () => { await persistent(); await fetch(`${CLIENT}/__writes/reset`); for (let p = 0; p < 4; p += 1) { await typeFor(5000, 120); await sleep(3000); } const w = await writes(); return { writes: w.map((x) => `${x.m} ${x.u}`) }; },
  // Q5: the draft (first block, not yet landed): 20 s of typing.
  rateDraft: async () => { await startWriting(); await fetch(`${CLIENT}/__writes/reset`); const keys = await typeFor(20000, 120); const w = await writes(); return { keys, writes: w.map((x) => `${x.m} ${x.u}`) }; },
  // Q5: IME, 12 compositions in 30 s, no Enter.
  rateIme: async () => { await persistent(); await fetch(`${CLIENT}/__writes/reset`); const t = Date.now(); let n = 0; while (Date.now() - t < 30000) { await ime('xianzhi', '现值'); n += 1; await sleep(2000); } const w = await writes(); return { compositions: n, writes: w.map((x) => `${x.m} ${x.u}`) }; },
};
const rows = [];
for (const [name, run] of Object.entries(ARMS)) {
  if (!new RegExp(FILTER).test(name)) continue;
  for (let i = 0; i < Number(SAMPLES); i += 1) {
    const a = await newNote(`A20 ${name} ${i}`);
    await fetch(`${CLIENT}/__mode/off`); await setAuth(); await open(a);
    let result; let err = null;
    try { result = await run(a); } catch (e) { err = String(e).slice(0, 200); }
    await sleep(1500);
    const row = { arm: name, i, result, server: await serverText(a), err };
    rows.push(row); console.log(JSON.stringify(row));
  }
}
fs.writeFileSync(OUT, JSON.stringify({ client: CLIENT, rows }, null, 1));
console.log('DONE', rows.length);
ws.close(); chrome.kill();
