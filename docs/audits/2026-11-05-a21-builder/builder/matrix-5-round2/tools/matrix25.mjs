// A-18 key matrix against a scratch server and client only. Real Chrome, real CDP key events, new note per sample.
// usage: node matrix.mjs <clientUrl> <out.json> <rounds> <latencyMs> [armFilter] [port]
import fs from 'node:fs';
import { spawn } from 'node:child_process';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const [CLIENT, OUT, ROUNDS = '1', LATENCY = '0', FILTER = '', PORT = '3001'] = process.argv.slice(2);
const API = `http://127.0.0.1:${PORT}/api`;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const email = 'a18@example.test';
const password = 'a18-scratch-pass';
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
// Request-stage interception (the browser never sends what is held): set fetchRule to decide per request.
let fetchRule = null; const fetchHeld = [];
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
  if (m.method === 'Fetch.requestPaused') { const p = m.params; const hold = fetchRule && fetchRule(p.request);
    if (hold) fetchHeld.push(`HELD-IN-BROWSER ${p.request.method} ${p.request.url.replace(/^.*\/api/, '').replace(/[0-9a-f-]{36}/g, ':id')}`);
    else ws.send(JSON.stringify({ id: ++seq, method: 'Fetch.continueRequest', params: { requestId: p.requestId } })); } });
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
  ARMS.push({ name: `hashEnter@${gap}`, expected: ['第一段', '[heading_1]标题甲', '正文'], domExpected: ['第一段', '标题甲', '正文'], run: async () => { await ins('第一段'); await enter(); await sleep(40); await hash(); await ins('标题甲'); await sleep(gap); await enter(); await sleep(40); await ins('正文'); } });
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
const midUnits = async (n) => { await typeKeys('aaa'); await sleep(2500); for (const w of ['bbb', 'ccc', 'ddd', 'eee'].slice(0, n - 1)) { await enter(); await sleep(600); await typeKeys(w); await sleep(600); } await sleep(1000); };
const upHome = async (n) => { for (let i = 0; i < n; i += 1) { await key('ArrowUp', 'ArrowUp', 38); await sleep(200); } await key('Home', 'Home', 36); await sleep(300); };
ARMS.push({ name: 'midHashTwoBody', expected: ['aaa', '[heading_1]bbb', 'ccc', 'ddd'], domExpected: ['aaa', 'bbb', 'ccc', 'ddd'], run: async () => { await midUnits(4); await upHome(2); await hash(); } });
ARMS.push({ name: 'midHashThird', expected: ['aaa', 'bbb', '[heading_1]ccc', 'ddd', 'eee'], domExpected: ['aaa', 'bbb', 'ccc', 'ddd', 'eee'], run: async () => { await midUnits(5); await upHome(2); await hash(); } });
ARMS.push({ name: 'midHashFirst', expected: ['[heading_1]aaa', 'bbb', 'ccc'], domExpected: ['aaa', 'bbb', 'ccc'], run: async () => { await midUnits(3); await upHome(2); await hash(); } });
const typeGap = async (word, gap) => { for (const c of word) { await key(c, `Key${c.toUpperCase()}`, c.toUpperCase().charCodeAt(0), c); await sleep(gap); } };
for (const gap of [80, 120, 160, 220]) {
  ARMS.push({ name: `a24letters@${gap}`, expected: ['warmup', '[heading_1]abcdefghijkl'], domExpected: ['warmup', 'abcdefghijkl'], run: async () => { await typeKeys('warmup'); await sleep(2500); await enter(); await sleep(800); await hash(); await typeGap('abcdefghijkl', gap); } });
  ARMS.push({ name: `a24first@${gap}`, expected: ['[heading_1]abcdefghijkl'], domExpected: ['abcdefghijkl'], run: async () => { await typeKeys('x'); await sleep(2500); await key('Backspace', 'Backspace', 8); await sleep(800); await hash(); await typeGap('abcdefghijkl', gap); } });
  ARMS.push({ name: `a24ime@${gap}`, expected: ['warmup', '[heading_1]现值公式推导'], domExpected: ['warmup', '现值公式推导'], run: async () => { await typeKeys('warmup'); await sleep(2500); await enter(); await sleep(800); await hash(); await ins('现值'); await sleep(gap * 3); await ins('公式'); await sleep(gap * 3); await ins('推导'); } });
}
const echoBad = [];
const setup = async () => { await typeKeys('warmup'); await sleep(2500); await enter(); await sleep(800); await hash(); };
const inWindow = () => ev(`!!document.querySelector('textarea[data-structure-typing-buffer]')`);
let windowSeen = false;
const stepIn = async () => { windowSeen = windowSeen || await inWindow(); };
ARMS.push({ name: 'winBackspace', expected: ['warmup', '[heading_1]abef'], domExpected: ['warmup', 'abef'], run: async () => { await setup(); await typeGap('abcd', 40); await key('Backspace', 'Backspace', 8); await key('Backspace', 'Backspace', 8); await stepIn(); await typeGap('ef', 40); } });
ARMS.push({ name: 'winArrow', expected: ['warmup', '[heading_1]abXcd'], domExpected: ['warmup', 'abXcd'], run: async () => { await setup(); await typeGap('abcd', 40); await key('ArrowLeft', 'ArrowLeft', 37); await key('ArrowLeft', 'ArrowLeft', 37); await stepIn(); await typeGap('X', 40); } });
ARMS.push({ name: 'winComposition', expected: ['warmup', '[heading_1]ab现值cd'], domExpected: ['warmup', 'ab现值cd'], run: async () => { await setup(); await typeGap('ab', 30); await stepIn(); await cdp('Input.imeSetComposition', { text: 'xian', selectionStart: 4, selectionEnd: 4 }); await sleep(150); await cdp('Input.imeSetComposition', { text: 'xianzhi', selectionStart: 7, selectionEnd: 7 }); await sleep(150); await cdp('Input.insertText', { text: '现值' }); await sleep(40); await typeGap('cd', 30); } });
ARMS.push({ name: 'ctlComposition', expected: ['warmup', 'ab现值cd'], run: async () => { await typeKeys('warmup'); await sleep(2500); await enter(); await sleep(1200); await typeGap('ab', 30); await sleep(1500); await cdp('Input.imeSetComposition', { text: 'xian', selectionStart: 4, selectionEnd: 4 }); await sleep(150); await cdp('Input.imeSetComposition', { text: 'xianzhi', selectionStart: 7, selectionEnd: 7 }); await sleep(150); await cdp('Input.insertText', { text: '现值' }); await sleep(40); await typeGap('cd', 30); } });
ARMS.push({ name: 'winShot', expected: ['warmup', '[heading_1]abcd'], domExpected: ['warmup', 'abcd'], run: async () => { await setup(); await typeGap('abcd', 30); const held = await inWindow(); const r = await cdp('Page.captureScreenshot', { format: 'jpeg', quality: 70 }); fs.writeFileSync('D:/Coinsides/v2.x/Coincides/docs/audits/2026-11-05-a21-builder/window-echo-during.jpg', Buffer.from(r.result.data, 'base64')); console.log('SHOT inWindow', held, await ev(`JSON.stringify((()=>{const t=document.querySelector('textarea[data-structure-typing-buffer]');if(!t)return null;const r=t.getBoundingClientRect();const c=getComputedStyle(t);return {x:r.x,y:r.y,w:r.width,h:r.height,font:c.fontSize,weight:c.fontWeight,color:c.color,bg:c.backgroundColor}})())`)); await sleep(2500); const r2 = await cdp('Page.captureScreenshot', { format: 'jpeg', quality: 70 }); fs.writeFileSync('D:/Coinsides/v2.x/Coincides/docs/audits/2026-11-05-a21-builder/window-echo-after.jpg', Buffer.from(r2.result.data, 'base64')); } });
ARMS.push({ name: 'winEcho', expected: ['warmup', '[heading_1]abcdefgh'], domExpected: ['warmup', 'abcdefgh'], run: async () => { await setup(); let typed = ''; for (const c of 'abcdefgh') { await typeGap(c, 0); typed += c; const shown = await ev(`(()=>{const a=document.activeElement;const r=a&&a.getBoundingClientRect?a.getBoundingClientRect():null;return a&&a.tagName==='TEXTAREA'&&r.width>0?a.value:'<'+(a&&a.tagName)+'>'})()`); if (shown !== typed) echoBad.push(`${typed} shown ${shown}`); await sleep(50); } } });
const contains = async (word) => ev(`[...document.querySelectorAll('textarea')].some(t=>t.value.includes(${JSON.stringify(word)}))`);
for (const name of ['fail', 'hang']) {
  ARMS.push({ name: `inject_${name}`, inject: true, wait: name === 'hang' ? 15000 : 5000, word: 'kept', run: async () => { await fetch(`${CLIENT}/__mode/${name}`); await setup(); await typeGap('kept', 40); } });
}
ARMS.push({ name: 'inject_failThenLeaveBack', inject: true, wait: 6000, word: 'kept', run: async (id) => { const other = await newNote('A24 other2'); await fetch(`${CLIENT}/__mode/fail`); await setup(); await typeGap('kept', 40); await sleep(4000); await ev(`location.hash=${JSON.stringify('#/notes/' + other)}`); await sleep(3000); await fetch(`${CLIENT}/__mode/off`); await ev(`location.hash=${JSON.stringify('#/notes/' + id)}`); } });
ARMS.push({ name: 'inject_leaveBack', inject: true, wait: 6000, word: 'kept', run: async (id) => { const other = await newNote('A24 other3'); await setup(); await typeGap('kept', 30); await ev(`location.hash=${JSON.stringify('#/notes/' + other)}`); await sleep(4000); await ev(`location.hash=${JSON.stringify('#/notes/' + id)}`); } });
ARMS.push({ name: 'inject_back', inject: true, wait: 5000, word: 'kept', run: async (id) => {
  // A history entry the way the router makes one, so the browser's Back has a known delta. Then the real Back.
  await cdp('Page.navigate', { url: `${CLIENT}/?r=${Date.now()}#/projects` }); await sleep(2500);
  await ev(`(()=>{const s={idx:(history.state&&history.state.idx||0)+1,key:'a24',usr:null};history.pushState(s,'','#/notes/${id}');dispatchEvent(new PopStateEvent('popstate',{state:s}));return 1})()`);
  for (let i = 0; i < 60; i += 1) { if (await ev(`/Double-click to start writing/.test(document.querySelector('main')?.innerText||'')`)) break; await sleep(200); }
  await sleep(500);
  await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 700, y: 620 });
  for (const clickCount of [1, 2]) { await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x: 700, y: 620, button: 'left', buttons: 1, clickCount }); await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 700, y: 620, button: 'left', buttons: 0, clickCount }); }
  await sleep(500);
  await setup(); await typeGap('kept', 30);
  const h = await cdp('Page.getNavigationHistory');
  const idx = h.result.currentIndex;
  console.log('BACK from', h.result.entries[idx]?.url?.slice(-30), 'to', h.result.entries[idx - 1]?.url?.slice(-20));
  await cdp('Page.navigateToHistoryEntry', { entryId: h.result.entries[idx - 1].id });
  await sleep(300); console.log('AT', await ev('location.hash'), 'window', await ev(`!!document.querySelector('textarea[data-structure-typing-buffer]')`));
} });
ARMS.push({ name: 'inject_leaveThenRefreshBack', inject: true, wait: 6000, word: 'kept', run: async (id) => { const other = await newNote('A24 other4'); await setup(); await typeGap('kept', 30); await ev(`location.hash=${JSON.stringify('#/notes/' + other)}`); await sleep(3000); await cdp('Page.navigate', { url: `${CLIENT}/?r=${Date.now()}#/notes/${id}` }); } });
ARMS.push({ name: 'inject_leaveInApp', inject: true, wait: 5000, word: 'kept', run: async () => { await setup(); await typeGap('kept', 30); const href = await ev(`(()=>{const all=[...document.querySelectorAll('a')];const t=all.find(a=>/projects|tool-receipts|boards/.test(a.getAttribute('href')||''));if(!t)return 'NONE '+all.map(a=>a.getAttribute('href')).join(',');t.click();return t.getAttribute('href')})()`); console.log('LINK', href); } });
ARMS.push({ name: 'inject_leaveAddressBar', inject: true, leave: true, wait: 3000, word: 'kept', run: async () => { const other = await newNote('A24 other'); await setup(); await typeGap('kept', 30); await ev(`location.hash=${JSON.stringify('#/notes/' + other)}`); } });

// Order A-21/A-24 rework: Enter in the window, then one failure or a leave. Pass = after recovery and a reload
// the note holds both words; while failing, they are on screen with the notice and stored.
// Times Enter in the window to the words being in note editors with no window left. Installed before the
// Enter, so it adds nothing between the keys.
const landProbe = (words) => ev(`(()=>{window.__landMs=null;window.__landT0=null;const w=${JSON.stringify(words)};
  const onKey=(e)=>{if(e.key==='Enter'&&window.__landT0===null){window.__landT0=performance.now();removeEventListener('keydown',onKey,true);}};
  addEventListener('keydown',onKey,true);
  const timer=setInterval(()=>{if(window.__landT0===null)return;if(document.querySelector('textarea[data-structure-typing-buffer]'))return;
    const v=[...document.querySelectorAll('textarea:not([data-structure-typing-buffer])')].map(t=>t.value).join(' ');
    if(w.every(x=>v.includes(x))){window.__landMs=Math.round(performance.now()-window.__landT0);clearInterval(timer);}},5);return 1})()`);
const enterSetup = async (mode) => { await typeKeys('warmup'); await sleep(2500); await enter(); await sleep(800);
  if (mode) await fetch(`${CLIENT}/__mode/${mode}`); await hash(); await typeGap('kept', 90); await landProbe(['kept', 'body']); await enter(); await typeGap('body', 50); };
for (const [name, mode, wait] of [['clean', null, 5000], ['create', 'create', 5000], ['reorder', 'reorder', 5000], ['placement', 'placement', 5000],
  ['save2', 'save@1', 5000], ['save3', 'save@2', 5000], ['hangWatchdog', 'hang', 14000]]) {
  ARMS.push({ name: `enter_${name}`, enterInject: true, wait, run: async () => { await enterSetup(mode); } });
}
const clickOut = async () => ev(`(()=>{const all=[...document.querySelectorAll('a')];const t=all.find(a=>/projects|tool-receipts|boards/.test(a.getAttribute('href')||''));if(!t)return 'NONE';t.click();return t.getAttribute('href')})()`);
for (const ms of [350, 1000]) {
  ARMS.push({ name: `enter_leaveInApp${ms}`, enterInject: true, wait: 5000, run: async () => { await typeKeys('warmup'); await sleep(2500); await enter(); await sleep(800); await hash(); await typeGap('abcd', 90); await enter(); const t = Date.now(); await typeGap('body', 50); const rest = ms - (Date.now() - t); if (rest > 0) await sleep(rest); console.log('LINK', await clickOut()); }, words: ['abcd', 'body'] });
}
ARMS.push({ name: 'enter_leaveAddressBar', enterInject: true, wait: 5000, run: async () => { const other = await newNote('A25 other'); await enterSetup(null); await ev(`location.hash=${JSON.stringify('#/notes/' + other)}`); } });
// Option 4 probes: the heading's transfer reaches the server, its reply is held 3 s; the person leaves meanwhile.
const slowSetup = async () => { await typeKeys('warmup'); await sleep(2500); await enter(); await sleep(800);
  await fetch(`${CLIENT}/__mode/slowreply`); await hash(); await typeGap('kept', 90); await enter(); await typeGap('body', 50); await sleep(400); };
ARMS.push({ name: 'enter_slowReplyAddressBar', enterInject: true, wait: 6000, run: async () => { const other = await newNote('A25 other'); await slowSetup(); await ev(`location.hash=${JSON.stringify('#/notes/' + other)}`); } });
ARMS.push({ name: 'enter_slowReplyUnload', enterInject: true, wait: 4000, run: async () => { await slowSetup(); await cdp('Page.navigate', { url: `${CLIENT}/?u=${Date.now()}#/projects` }); } });
ARMS.push({ name: 'enter_unload', enterInject: true, wait: 1000, run: async () => { await typeKeys('warmup'); await sleep(2500); await enter(); await sleep(800); await fetch(`${CLIENT}/__mode/hang`); await hash(); await typeGap('head', 90); await sleep(300); await cdp('Page.navigate', { url: `${CLIENT}/?u=${Date.now()}#/projects` }); }, words: ['head'] });
// Round 2, red 1 (K1/K2): the save of the heading's role change is held 12 s, then passes / fails / the page goes
// away while it is held. No Enter. Words: 'kept'. Pass = heading 'kept' in a block of its own, 'warmup' apart.
const STALL = process.env.STALL_SKIP ?? '2';
const roleStall = async (mode) => { await typeKeys('warmup'); await sleep(2500); await enter(); await sleep(2500);
  await fetch(`${CLIENT}/__mode/${mode}@${STALL}`); await hash(); await typeGap('kept', 90); };
ARMS.push({ name: 'k_roleStallOk', enterInject: true, wait: 16000, words: ['kept'], run: async () => { await roleStall('stall'); } });
ARMS.push({ name: 'k_roleStallFail', enterInject: true, wait: 16000, words: ['kept'], run: async () => { await roleStall('stallfail'); } });
// Past the bound: held 25 s then let through. Recorded, not required: by then the second structure's watchdog has gone.
ARMS.push({ name: 'k_roleStall25Ok', enterInject: true, wait: 30000, words: ['kept'], run: async () => { await roleStall('stall25'); } });
ARMS.push({ name: 'k_roleStallUnload', enterInject: true, wait: 14000, words: ['kept'], run: async () => { await roleStall('stall'); await sleep(3000);
  await cdp('Page.navigate', { url: `${CLIENT}/?u=${Date.now()}#/projects` }); } });
// Round 2, 3b: the window's words land in the note, then the page goes away before their save reaches the server.
ARMS.push({ name: 'h_landedUnload', enterInject: true, wait: 1500, words: ['head', 'body'], run: async () => {
  await typeKeys('warmup'); await sleep(2500); await enter(); await sleep(2500);
  await fetch(`${CLIENT}/__mode/holdsaves`); await hash(); await typeGap('head', 90); await enter(); await typeGap('body', 50);
  // Wait until the window has handed its words to the note (no box left and 'body' in an editor), then leave at once.
  for (let i = 0; i < 400; i += 1) {
    if (await ev(`!document.querySelector('textarea[data-structure-typing-buffer]') && [...document.querySelectorAll('textarea[data-text-unit-id]')].some(t=>t.value.includes('body'))`)) break;
    await sleep(10);
  }
  console.log('LANDED-AT-UNLOAD', await ev(`JSON.stringify({stored:Object.keys(localStorage).filter(k=>k.startsWith('coincides:unplaced')).map(k=>localStorage.getItem(k).slice(0,200))})`));
  await cdp('Page.navigate', { url: `${CLIENT}/?u=${Date.now()}#/projects` }); } });
// Round 2, 3b direct: once the words have landed from the window, no text save reaches the server; the page goes 100 ms later.
ARMS.push({ name: 'h_landedThenDrop', enterInject: true, wait: 1500, words: ['head', 'body'], run: async () => {
  await typeKeys('warmup'); await sleep(2500); await enter(); await sleep(2500);
  await hash(); await typeGap('head', 90); await enter(); await typeGap('body', 50);
  let landedAt = null;
  for (let i = 0; i < 600; i += 1) {
    if (await ev(`!document.querySelector('textarea[data-structure-typing-buffer]') && [...document.querySelectorAll('textarea[data-text-unit-id]')].some(t=>t.value.includes('body'))`)) { landedAt = i * 10; break; }
    await sleep(10);
  }
  await fetch(`${CLIENT}/__mode/blackhole`);
  console.log('LANDED', landedAt, await ev(`JSON.stringify({stored:Object.keys(localStorage).filter(k=>k.startsWith('coincides:unplaced')).map(k=>localStorage.getItem(k).slice(0,200))})`));
  await sleep(100);
  await cdp('Page.navigate', { url: `${CLIENT}/?u=${Date.now()}#/projects` }); } });
// Round 2, 3b as Tester's H-L: the text save carrying 'body' is held in the browser at the request stage (it never
// leaves), the page goes 150 ms later, and the note is opened again 12 s on.
ARMS.push({ name: 'h_HL', enterInject: true, wait: 12000, words: ['head', 'body'], run: async () => {
  await typeKeys('warmup'); await sleep(2500); await enter(); await sleep(2500);
  let heldAt = null;
  fetchRule = (r) => { const hit = /\/text-save/.test(r.url) && (r.postData || '').includes('body'); if (hit && heldAt === null) heldAt = Date.now(); return hit; };
  await cdp('Fetch.enable', { patterns: [{ urlPattern: '*/api/*', requestStage: 'Request' }] });
  await hash(); await typeGap('head', 90); await enter(); await typeGap('body', 50);
  for (let i = 0; i < 1500 && heldAt === null; i += 1) await sleep(10);
  await sleep(150);
  console.log('HL', heldAt ? 'held' : 'NOT-HELD', JSON.stringify(fetchHeld));
  await cdp('Page.navigate', { url: `${CLIENT}/?u=${Date.now()}#/projects` });
  await sleep(300); fetchRule = null; await cdp('Fetch.disable'); } });
const serverBlocks = async (id) => {
  const r = await (await fetch(`${API}/notes/${id}/blocks`, { headers: auth })).json();
  const list = Array.isArray(r) ? r : (r.blocks || []);
  return list.sort((a, b) => a.order_index - b.order_index).map((b) => (b.content_json?.text_flow?.units || [])
    .filter((u) => u.status !== 'deleted').map((u) => `${u.writing_role === 'paragraph' ? '' : `[${u.writing_role}]`}${u.text}`).join('|'));
};
const results = [];
const rounds = Number(ROUNDS);
for (let round = 0; round < rounds; round += 1) {
  for (const arm of ARMS) {
    if (FILTER && !arm.name.match(new RegExp(FILTER))) continue;
    const id = await newNote(`A18 ${arm.name} ${round}`);
    await open(id);
    if (arm.enterInject) {
      const words = arm.words ?? ['kept', 'body'];
      // Harness positive control: the same words planted under another note's key. They are not this row's.
      if (process.env.SEED_OTHER) await ev(`localStorage.setItem('coincides:unplaced-words:control:other-note-${round}', ${JSON.stringify(JSON.stringify([{ id: 'planted', blockId: 'b', unitId: 'u', initialText: '', text: words.join(' ') }]))}); 1`);
      await arm.run(id);
      await sleep(arm.wait);
      const faults = await (await fetch(`${CLIENT}/__log`)).json();
      const landedMs = await ev('window.__landMs ?? null');
      const seen = await ev(`(()=>{const v=[...document.querySelectorAll('textarea')].map(t=>t.value).join(' ');return {onScreen:${JSON.stringify(words)}.map(w=>v.includes(w)),notice:!!document.querySelector('[data-structure-typing-notice]'),stored:Object.keys(localStorage).filter(k=>k.startsWith('coincides:unplaced')).map(k=>localStorage.getItem(k).slice(0,200))}})()`);
      if (process.env.DIAGK1) console.log('K1DIAG', await ev('JSON.stringify(window.__k1 || null)'));
      await fetch(`${CLIENT}/__mode/off`);
      await cdp('Page.navigate', { url: `${CLIENT}/?r=${Date.now()}#/notes/${id}` });
      await sleep(7000);
      if (process.env.DBG25) {
        const raw = await (await fetch(`${API}/notes/${id}/blocks`, { headers: auth })).json();
        const list = Array.isArray(raw) ? raw : (raw.blocks || []);
        console.log('BLOCKS', JSON.stringify(list.map((x) => ({ id: x.id, order: x.order_index, units: (x.content_json?.text_flow?.units || []).map((u) => `${u.id}:${u.writing_role}:${u.text}`) }))));
        console.log('AFTER', JSON.stringify(await ev(`({notice:[...document.querySelectorAll('[data-structure-typing-notice]')].map(n=>n.innerText.slice(0,60)),bufs:[...document.querySelectorAll('textarea[data-structure-typing-buffer]')].map(t=>t.value),stored:Object.keys(localStorage).filter(k=>k.startsWith('coincides:unplaced')).map(k=>localStorage.getItem(k).slice(0,300))})`)));
      }
      const server = await serverUnits(id);
      const flatServer = server.join('|');
      const ok = words.every((w) => flatServer.includes(w));
      const split = server.some((t) => /^\[heading_1\]/.test(t) && t.includes(words[0])) && (words.length < 2 || server.some((t) => t === words[1]));
      const blocks = await serverBlocks(id);
      const held = faults.filter((f) => f.startsWith('HELD'));
      results.push({ arm: arm.name, round, ok, split, landedMs, seen, server, blocks, held, faults: faults.filter((f) => f.startsWith('FAULT') || f.startsWith('DROPPED')), note: id });
      console.log(ok ? 'OK ' : 'BAD', arm.name, round, JSON.stringify({ split, seen, server, blocks, held, faults: faults.filter((f) => f.startsWith('FAULT')) }));
      fs.writeFileSync(OUT, JSON.stringify(results, null, 0));
      continue;
    }
    if (arm.inject) {
      await arm.run(id);
      await sleep(arm.wait);
      console.log('LOCATION', await ev('location.hash'));
      const onScreen = await contains(arm.word);
      if (process.env.DBG) { const seen = {}; const log = await ev('window.__d'); console.log((log||[]).filter((l)=>{const k=l.replace(/^[0-9]+ /,'');if(seen[k])return false;seen[k]=1;return true}).slice(-40).join(String.fromCharCode(10))); }
      const notice = await ev(`!!document.querySelector('[data-structure-typing-notice]')`);
      await fetch(`${CLIENT}/__mode/off`);
      await sleep(1000);
      const retried = await ev(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>/retry/i.test(x.textContent||''));if(b){b.click();return true}return false})()`);
      if (arm.name === 'inject_fail') { await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x: 1400, y: 300, button: 'left', buttons: 1, clickCount: 1 }); await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 1400, y: 300, button: 'left', buttons: 0, clickCount: 1 }); await sleep(200);
        await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'z', code: 'KeyZ', windowsVirtualKeyCode: 90, modifiers: 2 }); await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'z', code: 'KeyZ', windowsVirtualKeyCode: 90, modifiers: 2 }); }
      await sleep(3000);
      const server = await serverUnits(id);
      const inServer = server.some((t) => t.includes(arm.word));
      const toast = await ev(`document.body.innerText.includes('could not')||document.body.innerText.includes('Retry')`);
      const ok = onScreen || inServer;
      const after = await ev(`[...document.querySelectorAll('textarea')].filter(t=>t.value.includes('kept')).map(t=>(t.dataset.structureTypingBuffer?'BUFFER:':'ED:')+t.value)`);
      results.push({ arm: arm.name, round, ok, onScreen, notice, inServer, toast, retried, after, server, note: id });
      console.log('INJECT', arm.name, JSON.stringify({ ok, onScreen, notice, inServer, toast, retried, after, server }));
      fs.writeFileSync(OUT, JSON.stringify(results, null, 0));
      continue;
    }
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
console.log('ECHO', JSON.stringify(echoBad));
console.log(JSON.stringify({ total: results.length, bad, latency: Number(LATENCY), byArm }));
await Promise.race([cdp('Browser.close'), sleep(1500)]);
chrome.kill();
process.exit(0);
