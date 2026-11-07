// My round-04 sequences, unchanged, pointed at any origin. Before and after run the same file.
// Usage: node matrix_r04.mjs <label> <origin> <api> <account:local|island> <arms: comma list of K,W,H,C,M> [rounds]
import fs from 'node:fs';
import { randomBytes } from 'node:crypto';
import { launch, sleep } from '../verify-p2/harness/cdp.mjs';

const realFetch = globalThis.fetch;
globalThis.fetch = async (...args) => { for (let i = 0; ; i += 1) { try { return await realFetch(...args); } catch (error) { if (i >= 24) throw error; await new Promise((r) => setTimeout(r, 5000)); } } };
const [LABEL, ORIGIN, API, ACCOUNT, ARMS = 'K,W,H', ROUNDS = '1'] = process.argv.slice(2);
const HERE = '<session-tmp>/scratchpad/verify-editor';
const OUT = `${HERE}/runs/${LABEL}`;
fs.mkdirSync(OUT, { recursive: true });
const ROOT = '<tmp>/r04a';
let email; let password; let COURSE;
const J = { 'Content-Type': 'application/json' };
if (ACCOUNT === 'island') {
  const cells = fs.readFileSync('<home>/.claude/ops/island-test-accounts.md', 'utf8').split(String.fromCharCode(10)).find((l) => l.includes('<my-test-account>')).split('|').map((c) => c.trim());
  email = cells[2]; password = cells[3]; COURSE = '2247e6ee-3564-4a8a-8537-f547e10c51e8';
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

const b = await launch({ port: 9000 + Math.floor(Math.random() * 900), profile: `${ROOT}/profiles/${LABEL}`, width: 1440, height: 1000 });
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
