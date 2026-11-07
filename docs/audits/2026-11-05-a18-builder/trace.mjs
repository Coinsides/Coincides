// One sample with a timeline: caret and value every animation frame, plus requests and focus changes.
// usage: node trace.mjs <clientUrl> <gap> <after> <tries>
import { spawn } from 'node:child_process';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const [CLIENT, GAP = '300', AFTER = '300', TRIES = '4'] = process.argv.slice(2);
const API = 'http://127.0.0.1:3001/api';
const json = { 'Content-Type': 'application/json' };
const login = await (await fetch(`${API}/auth/login`, { method: 'POST', headers: json, body: JSON.stringify({ email: 'a18@example.test', password: 'a18-scratch-pass' }) })).json();
const auth = { Authorization: `Bearer ${login.token}`, ...json };
const course = (await (await fetch(`${API}/courses`, { headers: auth })).json()).find((c) => c.name === 'A18');
const debugPort = 9800 + Math.floor(Math.random() * 100);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', `--remote-debugging-port=${debugPort}`, `--user-data-dir=${process.env.TEMP}/a18-trace-${debugPort}`, '--window-size=1440,1000', 'about:blank'], { stdio: 'ignore' });
let target;
for (let i = 0; i < 150 && !target; i += 1) { try { target = (await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json()).find((t) => t.type === 'page'); } catch { /* */ } if (!target) await sleep(200); }
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let seq = 0; const pending = new Map(); let events = [];
const mark = (m) => events.push(`${String(Date.now() - t0).padStart(5)} ${m}`);
let t0 = Date.now();
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
  if (m.method === 'Network.requestWillBeSent' && m.params.request.url.includes('/api/') && !m.params.request.url.includes('palette') && !m.params.request.url.includes('skin')) {
    const body = m.params.request.postData ? ` ${m.params.request.postData.replace(/"(metadata|layout|canvas_layout|display_overrides_json)":\{[^}]*\}/g, '').slice(0, 170)}` : '';
    mark(`REQ ${m.params.request.method} ${m.params.request.url.split('/api')[1].slice(0, 70)}${m.params.request.method === 'GET' ? '' : body}`);
  }
});
const cdp = (method, params = {}) => new Promise((r) => { const i = ++seq; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expression) => (await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result?.result?.value;
await cdp('Page.enable'); await cdp('Runtime.enable'); await cdp('Network.enable');
await cdp('Emulation.setFocusEmulationEnabled', { enabled: true });
await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
await cdp('Page.navigate', { url: `${CLIENT}/#/login` }); await sleep(2000);
await ev(`localStorage.setItem('coincides_auth_token', ${JSON.stringify(login.token)}); 1`);
const key = async (k, code, vk, text) => { await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, ...(text ? { text } : {}) }); await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk }); };
const SAMPLER = `(()=>{window.__log=[];let last='';const f=()=>{const a=document.activeElement;const all=[...document.querySelectorAll('textarea[data-text-unit-id]')].map(t=>t.value).join('|');const s=(a&&a.tagName==='TEXTAREA'?(a.dataset.draftOwn||'')+'['+(a.dataset.blockId||'title').slice(0,8)+'/'+(a.dataset.textUnitId||'').slice(0,6)+']'+JSON.stringify(a.value)+'@'+a.selectionStart:(a?a.tagName:'none'))+' all='+all;if(s!==last){last=s;window.__log.push([Math.round(performance.now()-window.__t0),s]);}window.__sam=setTimeout(f,5);};window.__t0=performance.now();f();})();1`;

for (let attempt = 0; attempt < Number(TRIES); attempt += 1) {
  const id = (await (await fetch(`${API}/notes`, { method: 'POST', headers: auth, body: JSON.stringify({ course_id: course.id, title: `trace ${attempt}` }) })).json()).id;
  await cdp('Page.navigate', { url: `${CLIENT}/?r=${Date.now()}#/notes/${id}` });
  for (let i = 0; i < 100; i += 1) { if (await ev(`/Double-click to start writing/.test(document.querySelector('main')?.innerText||'')`)) break; await sleep(100); }
  await sleep(500);
  await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 700, y: 620 });
  for (const clickCount of [1, 2]) { await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x: 700, y: 620, button: 'left', buttons: 1, clickCount }); await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 700, y: 620, button: 'left', buttons: 0, clickCount }); }
  await sleep(500);
  events = []; t0 = Date.now();
  await ev(SAMPLER);
  mark('INS first'); await cdp('Input.insertText', { text: '第一段' });
  await sleep(Number(GAP));
  mark('ENTER'); await key('Enter', 'Enter', 13, '\r');
  await sleep(Number(AFTER));
  mark('INS second'); await cdp('Input.insertText', { text: '第二行' });
  await sleep(2000);
  const log = await ev('clearTimeout(window.__sam); window.__log');
  const dom = await ev(`[...document.querySelectorAll('textarea[data-text-unit-id]')].map(t=>t.value)`);
  const ok = JSON.stringify(dom) === JSON.stringify(['第一段', '第二行']);
  console.log(`\n=== attempt ${attempt} ok=${ok} dom=${JSON.stringify(dom)}`);
  if (!ok || attempt === Number(TRIES) - 1) {
    console.log(events.join('\n'));
    for (const [t, s] of log) console.log(`  dom ${String(t).padStart(5)} ${s}`);
    if (!ok) break;
  }
}
await Promise.race([cdp('Browser.close'), sleep(1000)]);
chrome.kill();
process.exit(0);
