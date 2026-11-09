// A-20 acceptance probe header (Tester(1), 2026-11-08): local backend only. Each probe = this head + one body.
// Usage: node <probe> <label> <front origin> <api base> local
import fs from 'node:fs';
import { randomBytes } from 'node:crypto';
import { launch, sleep } from './cdp.mjs';

const realFetch = globalThis.fetch;
globalThis.fetch = async (...args) => { for (let i = 0; ; i += 1) { try { return await realFetch(...args); } catch (error) { if (i >= 24) throw error; await new Promise((r) => setTimeout(r, 5000)); } } };
const [LABEL, ORIGIN, API, ACCOUNT, ARMS = 'K,W,H', ROUNDS = '1'] = process.argv.slice(2);
const HERE = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1').replace(/\/$/, ''); // the kit dir: seeds.json, cdp.mjs
const A20 = process.env.OUTDIR || HERE;
const OUT = `${A20}/runs/${LABEL}`;
fs.mkdirSync(OUT, { recursive: true });
if (!process.env.CREDROOT) throw new Error('set CREDROOT to a scratch dir (one per backend): the scratch account is kept there, never in a repo');
const ROOT = process.env.CREDROOT; fs.mkdirSync(`${ROOT}/profiles`, { recursive: true });
let email; let password; let COURSE;
const J = { 'Content-Type': 'application/json' };
if (ACCOUNT === 'island') {
  throw new Error('the A-20 kit runs on a local backend only (never the island)');
} else {
  const p = `${ROOT}/cred.json`;
  if (!fs.existsSync(p)) { const c = { email: '<email>', password: randomBytes(12).toString('hex'), name: 'Verify' }; const r = await fetch(`${API}/auth/register`, { method: 'POST', headers: J, body: JSON.stringify(c) }); if (r.status >= 300) console.log('register', r.status); fs.writeFileSync(p, JSON.stringify(c)); }
  ({ email, password } = JSON.parse(fs.readFileSync(p, 'utf8')));
}
const { token } = await (await fetch(`${API}/auth/login`, { method: 'POST', headers: J, body: JSON.stringify({ email, password }) })).json();
const auth = { Authorization: `Bearer ${token}`, ...J };
if (!COURSE) {
  const list = await (await fetch(`${API}/courses`, { headers: auth })).json();
  const found = (Array.isArray(list) ? list : []).find((c) => c.name === '实测·A18');
  COURSE = found?.id || (await (await fetch(`${API}/courses`, { method: 'POST', headers: auth, body: JSON.stringify({ name: '实测·A18', code: 'A18', semester: 'r04' }) })).json()).id;
}
const PRESET = process.env.PRESET || '';
const SEEDS = PRESET ? JSON.parse(fs.readFileSync(`${HERE}/seeds.json`, 'utf8')) : null;
// As the app's own new-note path does it: the preset on the note, then its seeded page frames.
const newNote = async (title) => {
  const id = (await (await fetch(`${API}/notes`, { method: 'POST', headers: auth, body: JSON.stringify({ course_id: COURSE, title, ...(PRESET ? { page_format: PRESET } : {}) }) })).json()).id;
  if (PRESET) { const r = await fetch(`${API}/canvas-objects/by-note/${id}/page-frame-collection`, { method: 'PUT', headers: auth, body: JSON.stringify({ collection: SEEDS[PRESET] }) }); if (!r.ok) throw new Error(`frames ${r.status}`); }
  return id;
};
const serverBlocks = async (id) => {
  const r = await (await fetch(`${API}/notes/${id}/blocks`, { headers: auth })).json();
  const list = Array.isArray(r) ? r : (r.blocks || []);
  return list.sort((a, b) => a.order_index - b.order_index).map((x) => ({ o: x.order_index, units: (x.content_json?.text_flow?.units || []).map((u) => `${u.writing_role === 'paragraph' || !u.writing_role ? '' : `[${u.writing_role}]`}${u.text}`), ids: (x.content_json?.text_flow?.units || []).map((u) => u.id), plain: x.plain_text }));
};
const serverUnits = async (id) => (await serverBlocks(id)).flatMap((x) => x.units);

const b = await launch({ port: Number(process.env.CDPPORT || 9640), profile: `${ROOT}/profiles/${LABEL}`, width: 1440, height: 1000 });
const errors = [];
b.on('Runtime.exceptionThrown', (p) => errors.push(p.exceptionDetails?.exception?.description?.slice(0, 240) || p.exceptionDetails?.text));
await b.cdp('Page.navigate', { url: `${ORIGIN}/#/login` });
await sleep(3000);
await b.ev(`localStorage.setItem('coincides_auth_token', ${JSON.stringify(token)}); 1`);
const STATE = `(()=>{const main=document.querySelector('[data-app-main-scroll="true"]');const tas=[...document.querySelectorAll('textarea')].filter(t=>getComputedStyle(t).visibility==='visible'&&t.getBoundingClientRect().width>200&&!t.closest('[class*=Title],[class*=title],[class*=escription]')).map(t=>{const r=t.getBoundingClientRect();return {v:t.value,ro:t.readOnly,x:Math.round(r.x+40),y:Math.round(r.y+r.height/2),h:Math.round(r.height),top:Math.round(r.top+(main?.scrollTop||0))}}).sort((a,b)=>a.top-b.top);const a=document.activeElement;return {tas,active:a?.tagName==='TEXTAREA'?a.value:a?.tagName,alert:[...document.querySelectorAll('[role=alert]')].map(e=>e.textContent.slice(0,80)),chapters:[...document.querySelectorAll('[aria-label^="Collapse chapter"]')].map(e=>e.getAttribute('aria-label').replace('Collapse chapter: ',''))}})()`;
const state = () => b.ev(STATE);
const key = async (k, code, vk, text) => { await b.cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, text }); await b.cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk }); };
const enter = () => key('Enter', 'Enter', 13, '\r');
const end = () => key('End', 'End', 35);
const ins = (s) => b.cdp('Input.insertText', { text: s });
const blurOutside = () => b.click(1380, 300);
const open = async (id) => {
  await b.cdp('Page.navigate', { url: `${ORIGIN}/?r=${Date.now()}#/notes/${id}` });
  const t0 = Date.now();
  for (;;) { const s = await state().catch(() => null); if (s && s.tas.length) return s; const m = await b.ev(`(document.querySelector('main')?.innerText||'')`).catch(() => ''); if (/Double-click to start writing/.test(m)) return s; if (Date.now() - t0 > 45000) return s; await sleep(200); }
};
const dbl = async (x, y) => { await b.move(x, y); await sleep(40); for (const n of [1, 2]) { await b.cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: n }); await sleep(30); await b.cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: n }); await sleep(50); } };
const clickTa = async (i) => { let s = await state(); if (!s.tas.length) { await dbl(700, 620); await sleep(1200); s = await state(); if (!s.tas.length) throw new Error('no textarea after surface click'); } const t = s.tas[i]; await b.click(t.x, t.y); await sleep(250); return t; };
// Dismiss the welcome dialog on a brand-new account.
{
  const id = await newNote('欢迎框');
  await open(id); await sleep(1200);
  for (let i = 0; i < 4; i += 1) {
    const c = await b.ev(`(()=>{if(!/Welcome to Coincides/.test(document.body.innerText))return null;const h=[...document.querySelectorAll('h1,h2,h3,div')].find(e=>e.children.length===0&&/Welcome to Coincides/.test(e.textContent));let m=h;for(let i=0;i<6&&m;i+=1){const x=m.querySelector&&m.querySelector('button');if(x)break;m=m.parentElement}const btns=[...m.querySelectorAll('button')];const e=btns.find(b=>!b.textContent.trim())||btns.find(b=>/skip/i.test(b.textContent));const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    if (!c) break;
    await b.click(c.x, c.y); await sleep(700);
  }
}
const log = fs.createWriteStream(`${OUT}/rows.jsonl`, { flags: 'a' });
const rows = [];
const add = (row) => { rows.push(row); log.write(`${JSON.stringify(row)}\n`); if (!row.ok) console.log('BAD', JSON.stringify(row).slice(0, 260)); };
const eq = (a, b2) => JSON.stringify(a) === JSON.stringify(b2);
const realKeys = async (t) => { for (const c of t) { await key(c, `Key${c.toUpperCase()}`, c.toUpperCase().charCodeAt(0), c); await sleep(90); } };
const ime = async (text) => { const pin = 'di'; await b.cdp('Input.imeSetComposition', { text: pin, selectionStart: pin.length, selectionEnd: pin.length }); await sleep(120); await b.cdp('Input.insertText', { text }); };
const typeChars = async (t) => { for (const c of t) { await b.cdp('Input.insertText', { text: c }); await sleep(120); } };
const typeHash = async () => { await key('#', 'Digit3', 51, '#'); await sleep(50); await key(' ', 'Space', 32, ' '); };

const press = async (k, code, vk, modifiers = 0) => { await b.cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers }); await b.cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers }); };
const backspace = () => press('Backspace', 'Backspace', 8);
const left = () => press('ArrowLeft', 'ArrowLeft', 37);
const keysAt = async (t, gap) => { for (const c of t) { if (/[a-z]/.test(c)) await key(c, `Key${c.toUpperCase()}`, c.toUpperCase().charCodeAt(0), c); else await key(c, `Digit${c}`, c.charCodeAt(0), c); await sleep(gap); } };
const fresh = async (title) => { const id = await newNote(title); await open(id); await clickTa(0); await sleep(800); return id; };
const finish = async (id, expected, arm, name, round, extra = {}) => { await sleep(1500); const st = await state(); await blurOutside(); await sleep(1800); const server = await serverUnits(id); const dom = st.tas.map((x) => x.v); add({ arm, name, round, dom, server, expected, ok: eq(dom, expected) && eq(server, expected), ...extra }); };
const ONLY = null;
// Review repros: the independent review's surviving findings, driven in the real app against the real backend.
// Requests are steered inside this Chrome only (Fetch at the Request stage); the server is untouched.
const ctrl = (k, code, vk, commands) => b.cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers: 2, commands }).then(() => b.cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers: 2 }));
const undo = () => ctrl('z', 'KeyZ', 90, ['undo']);
const home = () => press('Home', 'Home', 36);
const goHash = (id) => b.ev(`location.hash='#/notes/${id}';1`);
const typeText = async (t, gap = 90) => { for (const c of t) { if (c === ' ') await key(' ', 'Space', 32, ' '); else await key(c, `Key${c.toUpperCase()}`, c.toUpperCase().charCodeAt(0), c); await sleep(gap); } };
const short = (u) => u.replace(/^.*\/api/, '').replace(/[0-9a-f-]{36}/g, ':id').replace(/\?.*$/, '');
const summarize = (pd) => { try { const j = JSON.parse(pd); const units = j?.block?.content_json?.text_flow?.units || j?.content_json?.text_flow?.units; if (Array.isArray(units)) return units.map((u) => `${u.writing_role && u.writing_role !== 'paragraph' ? `[${u.writing_role}]` : ''}${u.text}`).join('|'); return ''; } catch { return ''; } };
let rule = () => 'continue'; const held = []; const net = []; let t0 = Date.now(); let respRule = () => null;
const mark = () => { t0 = Date.now(); net.length = 0; };
b.on('Fetch.requestPaused', (p) => {
  if (p.responseStatusCode !== undefined || p.responseErrorReason) {
    let act = null; try { act = respRule({ u: short(p.request.url) }); } catch { act = null; }
    const go = () => b.cdp('Fetch.continueResponse', { requestId: p.requestId }).catch(() => b.cdp('Fetch.continueRequest', { requestId: p.requestId }).catch(() => {}));
    net.push(`${Date.now() - t0} RESP ${short(p.request.url)} ${p.responseStatusCode}${act && act.delay ? ` [respDelay${act.delay}]` : ''}`);
    if (act && act.delay) setTimeout(go, act.delay); else go();
    return;
  }
  const m = p.request.method; const u = short(p.request.url);
  if (!rule.gets && (m === 'GET' || m === 'OPTIONS' || /source-anchors/.test(u))) { b.cdp('Fetch.continueRequest', { requestId: p.requestId }).catch(() => {}); return; }
  let act = 'continue'; try { act = rule({ m, u, pd: p.request.postData ? summarize(p.request.postData) : '' }) || 'continue'; } catch { act = 'continue'; }
  const tag = act === 'continue' ? '' : ` [${typeof act === 'object' ? `delay${act.delay}` : act}]`;
  net.push(`${Date.now() - t0} ${m} ${u}${tag}${/text-save/.test(u) && p.request.postData ? ` ${summarize(p.request.postData)}` : ''}`);
  if (act === 'hold') held.push(p.requestId);
  else if (act === 'neterr') b.cdp('Fetch.failRequest', { requestId: p.requestId, errorReason: 'InternetDisconnected' }).catch(() => {});
  else if (act === '401') b.cdp('Fetch.fulfillRequest', { requestId: p.requestId, responseCode: 401, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }], body: Buffer.from('{"error":"Unauthorized"}').toString('base64') }).catch(() => {});
  else if (act === '500') b.cdp('Fetch.fulfillRequest', { requestId: p.requestId, responseCode: 500, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }], body: Buffer.from('{"error":"injected"}').toString('base64') }).catch(() => {});
  else if (typeof act === 'object' && act.delay) setTimeout(() => b.cdp('Fetch.continueRequest', { requestId: p.requestId }).catch(() => {}), act.delay);
  else b.cdp('Fetch.continueRequest', { requestId: p.requestId }).catch(() => {});
});
await b.cdp('Fetch.enable', { patterns: [{ urlPattern: '*/api/*', requestStage: 'Request' }, { urlPattern: '*unit-transfer*', requestStage: 'Response' }, { urlPattern: '*text-save*', requestStage: 'Response' }] });
const release = async () => { while (held.length) await b.cdp('Fetch.continueRequest', { requestId: held.shift() }).catch(() => {}); };
const WIN = `(()=>{const t=document.querySelector('textarea[data-structure-typing-buffer]');const n=document.querySelector('[data-structure-typing-notice]');const eds=[...document.querySelectorAll('textarea[data-runtime-textflow-editor="true"]')].filter(e=>e.getBoundingClientRect().width>0);const a=document.activeElement;return {buf:t?t.value:null,boxes:window.__bufs||0,focusBuf:a===t,active:(a?.tagName||'')+(a?.dataset?.runtimeTextflowEditor?':editor':'')+(a?.value!==undefined?'='+a.value.slice(0,40)+'@'+a.selectionStart:''),notice:n?n.innerText.slice(0,90):null,eds:eds.map(e=>e.value),alerts:[...new Set([...(window.__alerts||[]),...[...document.querySelectorAll('[role=alert],[class*=toast],[class*=Toast]')].map(x=>x.innerText.replace(/\\s+/g,' ').slice(0,90))].filter(Boolean))].slice(0,6),stored:Object.keys(localStorage).filter(k=>k.startsWith('coincides:unplaced')).map(k=>localStorage.getItem(k).slice(0,160))}})()`;
const win = () => b.ev(WIN);
// Kept words of THIS note only (the key ends with the note id); the old check read every note's entries.
const storedFor = (id) => b.ev(`Object.keys(localStorage).filter(k=>k.startsWith('coincides:unplaced')&&k.endsWith(${JSON.stringify(id)})).map(k=>localStorage.getItem(k))`);
let lastStoredHere = null;
// Count every words box that appears and every alert text, from the moment this is called on the current page.
const watch = () => b.ev(`(()=>{window.__bufs=0;window.__alerts=[];const grab=()=>{for(const x of document.querySelectorAll('[role=alert],[class*=toast],[class*=Toast]')){const s=x.innerText.replace(/\\s+/g,' ').slice(0,90);if(s&&!window.__alerts.includes(s))window.__alerts.push(s)}};new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes){if(n.nodeType!==1)continue;if(n.matches?.('textarea[data-structure-typing-buffer]')||n.querySelector?.('textarea[data-structure-typing-buffer]'))window.__bufs++}grab()}).observe(document.body,{childList:true,subtree:true,characterData:true});1})()`);
const shot = async (name) => { const r = await b.cdp('Page.captureScreenshot', { format: 'jpeg', quality: 70 }); fs.writeFileSync(`${OUT}/${name}.jpg`, Buffer.from(r.result.data, 'base64')); };
const blocksOf = async (id) => (await serverBlocks(id)).map((x) => x.units);
const flat = (bl) => JSON.stringify(bl);
const row = (name, id, data, ok) => { add({ arm: 'RV', name, id, ...data, storedHere: lastStoredHere, net: [...net], ok }); lastStoredHere = null; };
const prep = async (title) => { const id = await fresh(title); await typeText('warmup', 50); await sleep(200); await enter(); await sleep(2500); return id; };
const scenario = async (name, fn) => {
  rule = () => 'continue'; respRule = () => null; held.length = 0; mark();
  console.log('---', name);
  try { await fn(); } catch (e) { add({ arm: 'RV', name, ok: false, error: String(e).slice(0, 300), net: [...net] }); }
  rule = () => 'continue'; await release();
};
const tabAt = (title) => b.ev(`(()=>{const t=[...document.querySelectorAll('[role=tab],[class*=tab] *')].find(x=>x.children.length===0&&x.textContent.trim()===${JSON.stringify(title)});if(!t)return null;const r=t.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
const ONLY_RV = process.env.ONLY ? process.env.ONLY.split(',') : null;
const want = (name) => !ONLY_RV || ONLY_RV.some((p) => name.startsWith(p));

// A page-side timeline of the words box: every change of its value (null = no box), the '#', the Enter, the last
// key, the first mouse press and the first route change, all in ms from the moment it is installed.
const traceOn = () => b.ev(`(()=>{const T0=performance.now();const now=()=>Math.round(performance.now()-T0);window.__trace=[];window.__hashKeyAt=null;window.__enterAt=null;window.__lastKeyAt=null;window.__clickAt=null;window.__routeAt=null;let last='~';let lastH=location.hash;window.__hashes=[];clearInterval(window.__traceTimer);window.__traceTimer=setInterval(()=>{const t=document.querySelector('textarea[data-structure-typing-buffer]');const v=t?t.value:null;const k=v===null?'~null':v;if(k!==last){window.__trace.push([now(),v]);last=k}const h=location.hash;if(h!==lastH){window.__hashes.push([now(),h.replace(/[0-9a-f-]{36}/g,':id')]);lastH=h}},10);document.addEventListener('keydown',e=>{const t=now();window.__lastKeyAt=t;if(e.key==='#'&&window.__hashKeyAt===null)window.__hashKeyAt=t;if(e.key==='Enter'&&window.__enterAt===null)window.__enterAt=t},true);document.addEventListener('mousedown',()=>{if(window.__clickAt===null)window.__clickAt=now()},true);window.addEventListener('hashchange',()=>{if(window.__routeAt===null)window.__routeAt=now()});1})()`);
const traceGet = () => b.ev(`({trace:window.__trace,hashKeyAt:window.__hashKeyAt,enterAt:window.__enterAt,lastKeyAt:window.__lastKeyAt,clickAt:window.__clickAt,routeAt:window.__routeAt,hashes:window.__hashes})`);
const other = await newNote('R other');
const clickTaRetry = async () => { for (let k = 0; ; k += 1) { try { return await clickTa(0); } catch (e) { if (k >= 3) throw e; await sleep(1500); } } };
const arriveAndWarm = async (id) => { await open(other); await sleep(1500); await goHash(id); await sleep(2500); await clickTaRetry(); await sleep(800); await typeText('warmup', 50); await sleep(200); await enter(); await sleep(2500); };
// Round-2 new arms (Tester, 2026-11-07, on the round-2 package):
//  KU    : the role-change save held, then the whole page unloads while it is still held (builder's third K arm).
//          Two leave times: 1.5 s after the words (inside the watchdog) and 11 s (after it gave up).
//  EDGE  : the edge the builder lists and Main_Designer ruled 2: words land from the window, the save carrying them
//          fails (500), the structure moves the unit to a new block, the page closes, reopen. Expected: box + words in
//          the note, no second copy inside the note. EDGE-a: the carrying save is held until the unit-transfer is
//          seen (max 4 s), then answered 500. EDGE-b: answered 500 at once.
//  HL2   : H-L with the first structure finished before Enter (3.5 s pause after 'head'), then Enter + 'body'.
//  HL3   : H-L with everything typed fast (30 ms per key), so the first structure is still running.
//  TWO2  : two kept records in one note made by the slow-reply address leave (the kept path that works in the browser),
//          then discard one: the other must stay on screen, in storage and after reopen.
//  GEO   : notice and box geometry over real neighbour lines (a line above and a line below the kept unit), plus a
//          click-and-type on each neighbour. Variants: noEnter (one-line box), enter (two-line box), long (one long line).
const strip = (u) => u.replace(/^\[[a-z_0-9]+\]/, '');
const boxes = () => b.ev(`[...document.querySelectorAll('textarea[data-structure-typing-buffer]')].map(t=>({v:t.value,entry:t.dataset.structureTypingEntry||null,vis:t.getBoundingClientRect().width>0}))`);
const fail500 = (rid) => b.cdp('Fetch.fulfillRequest', { requestId: rid, responseCode: 500, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }], body: Buffer.from('{"error":"injected"}').toString('base64') }).catch(() => {});
const leavePage = () => b.cdp('Page.navigate', { url: `${ORIGIN}/?r=${Date.now()}#/notes/${other}` });
const edAt = (prefix) => b.ev(`(()=>{const e=[...document.querySelectorAll('textarea[data-runtime-textflow-editor="true"]')].find(x=>x.getBoundingClientRect().width>0&&x.value.startsWith(${JSON.stringify(prefix)}));if(!e)return null;const r=e.getBoundingClientRect();return {x:r.left,y:r.top,w:r.width,h:r.height,v:e.value}})()`);
const keptByLeave = async (words, withEnter, body, delay = 4000, gap = 90) => {
  respRule = ({ u }) => (/unit-transfer/.test(u) ? { delay } : null);
  await typeHash(); await typeText(words, gap);
  if (withEnter) { await enter(); await sleep(40); await typeText(body, 50); }
  await goHash(other); await sleep(Math.max(6000, delay + 2000));
  respRule = () => null;
  await goHash(lastId); await sleep(5000);
};
let lastId = null;
// Geometry of every box, its notice and every visible note line; overlap in px and what a click at each line would hit.
const GEO = `(()=>{const R=(e)=>{const r=e.getBoundingClientRect();return {top:r.top,left:r.left,bottom:r.bottom,right:r.right,w:r.width,h:r.height}};const ov=(a,b)=>{const x=Math.min(a.right,b.right)-Math.max(a.left,b.left);const y=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);return x>0&&y>0?{x:Math.round(x),y:Math.round(y)}:null};const eds=[...document.querySelectorAll('textarea[data-runtime-textflow-editor="true"]')].filter(e=>e.getBoundingClientRect().width>0);const bx=[...document.querySelectorAll('textarea[data-structure-typing-buffer]')].filter(e=>e.getBoundingClientRect().width>0);const ns=[...document.querySelectorAll('[data-structure-typing-notice]')].filter(e=>e.getBoundingClientRect().width>0);const what=(el)=>!el?null:el.closest('[data-structure-typing-notice]')?'NOTICE':el.matches('textarea[data-structure-typing-buffer]')?'BOX':el.dataset?.runtimeTextflowEditor?'EDITOR:'+el.value.slice(0,20):el.tagName+'.'+String(el.className).slice(0,24);const lines=eds.map(e=>{const r=R(e);const mid=r.top+Math.min(r.h,24)/2;return {v:e.value.slice(0,30),top:Math.round(r.top),h:Math.round(r.h),left:Math.round(r.left),w:Math.round(r.w),hitLeft:what(document.elementFromPoint(r.left+20,mid)),hitMid:what(document.elementFromPoint(r.left+r.w/2,mid))}});const boxes=bx.map(t=>{const r=R(t);const cs=getComputedStyle(t);const own=eds.find(e=>Math.abs(e.getBoundingClientRect().top-r.top)<4);return {v:t.value,entry:t.dataset.structureTypingEntry||null,styleLeft:t.style.left,styleTop:t.style.top,styleWidth:t.style.width,top:Math.round(r.top),bottom:Math.round(r.bottom),left:Math.round(r.left),right:Math.round(r.right),padRight:cs.paddingRight,own:own?own.value.slice(0,30):null,covers:eds.filter(e=>e!==own).map(e=>({v:e.value.slice(0,30),ov:ov(r,R(e))})).filter(x=>x.ov&&x.ov.y>=3)}});const notices=ns.map(n=>{const r=R(n);const btn=n.querySelector('button');const box=bx.find(t=>{const q=R(t);return r.top>=q.top-1&&r.bottom<=q.bottom+1&&r.left>=q.left-1&&r.right<=q.right+1})||null;return {styleLeft:n.style.left,styleTop:n.style.top,text:(n.innerText||'').replace(/\\s+/g,' ').trim(),title:n.getAttribute('title')||n.getAttribute('aria-label')||'',btn:btn?(btn.textContent||'').trim():null,btnTitle:btn?(btn.getAttribute('title')||btn.getAttribute('aria-label')||''):'',pe:getComputedStyle(n).pointerEvents,btnPe:btn?getComputedStyle(btn).pointerEvents:null,top:Math.round(r.top),bottom:Math.round(r.bottom),left:Math.round(r.left),right:Math.round(r.right),insideBox:Boolean(box),covers:eds.map(e=>({v:e.value.slice(0,30),ov:ov(r,R(e))})).filter(x=>x.ov)}});return {lines,boxes,notices}})()`;
const anchoredLine = (g, bx) => g.lines.find((l) => Math.abs(l.top - bx.top) < 4 && Math.min(bx.right, l.left + l.w) - Math.max(bx.left, l.left) > Math.min(50, l.w / 3)) || null;
const inv = (g) => {
  const bad = []; const info = [];
  const vis = g.boxes;
  for (const bx of vis) {
    if (bx.covers.length) bad.push(`box over ${bx.covers.map((c) => JSON.stringify(c.v)).join(',')}`);
    // Anchored = on its unit: same top AND overlapping that line sideways. A docked box beside the column can share a
    // top with some line without being on it.
    const own = anchoredLine(g, bx);
    if (own && bx.bottom - bx.top > own.h + 4) bad.push(`anchored box ${bx.bottom - bx.top}px taller than its line ${own.h}px`);
  }
  for (let a = 0; a < vis.length; a += 1) for (let c = a + 1; c < vis.length; c += 1) {
    const x = Math.min(vis[a].right, vis[c].right) - Math.max(vis[a].left, vis[c].left);
    const y = Math.min(vis[a].bottom, vis[c].bottom) - Math.max(vis[a].top, vis[c].top);
    if (x > 2 && y > 2) bad.push(`boxes ${a} and ${c} overlap ${Math.round(x)}x${Math.round(y)}`);
  }
  for (const n of g.notices) {
    // A notice inside an anchored box lies on that box's own line by design; only other lines count.
    const ownVals = new Set(vis.map((bx) => anchoredLine(g, bx)).filter(Boolean).map((l) => l.v));
    const others = n.covers.filter((c) => !ownVals.has(c.v));
    if (others.length) bad.push(`notice over ${others.map((c) => JSON.stringify(c.v)).join(',')}`);
    // Recorded only: r2.3 may stack a notice below its box; what matters is that it covers no line (checked above).
    if (vis.length && !n.insideBox) info.push('notice outside its box');
  }
  // Every line that is not a box's own unit must be hit as itself, at its left end and its middle.
  const owns = new Set(vis.map((bx) => anchoredLine(g, bx)).filter(Boolean).map((l) => `${l.v}@${l.top}`));
  for (const l of g.lines) {
    if (owns.has(`${l.v}@${l.top}`)) continue;
    // Only the box or its notice count as covering; the app's own block toolbar over an active line is not this order.
    for (const h of [l.hitLeft, l.hitMid]) if (h === 'BOX' || h === 'NOTICE') bad.push(`line ${JSON.stringify(l.v)} hit ${h}`);
  }
  return { folded: vis.length === 0 && g.notices.length > 0, boxes: vis.length, notices: g.notices.length, bad, info };
};
const showWordsAt = `(()=>{const btn=[...document.querySelectorAll('[data-structure-typing-notice] button')].find(x=>x.getBoundingClientRect().width>0&&/show words/i.test(x.textContent||''));if(!btn)return null;const r=btn.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`;
