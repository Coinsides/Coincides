// My round-04 sequences, unchanged, pointed at any origin. Before and after run the same file.
// Usage: node matrix_r04.mjs <label> <origin> <api> <account:local|island> <arms: comma list of K,W,H,C,M> [rounds]
import fs from 'node:fs';
import { randomBytes } from 'node:crypto';
import { launch, sleep } from '../verify-p2/harness/cdp.mjs';

const [LABEL, ORIGIN, API, ACCOUNT, ARMS = 'K,W,H', ROUNDS = '1'] = process.argv.slice(2);
const HERE = '<tmp>/<session>/scratchpad/verify-a18';
const OUT = `${HERE}/runs/${LABEL}`;
fs.mkdirSync(OUT, { recursive: true });
const ROOT = '<tmp>/r04a';
let email; let password; let COURSE;
const J = { 'Content-Type': 'application/json' };
if (ACCOUNT === 'island') {
  const cells = fs.readFileSync('<ops>/island-test-accounts.md', 'utf8').split(String.fromCharCode(10)).find((l) => l.includes('<island account in ops>')).split('|').map((c) => c.trim());
  email = cells[2]; password = cells[3]; COURSE = '2247e6ee-3564-4a8a-8537-f547e10c51e8';
} else {
  const p = `${ROOT}/cred.json`;
  if (!fs.existsSync(p)) { const c = { email: 't1.a18@example.test', password: randomBytes(12).toString('hex'), name: 'Verify' }; const r = await fetch(`${API}/auth/register`, { method: 'POST', headers: J, body: JSON.stringify(c) }); if (r.status >= 300) console.log('register', r.status); fs.writeFileSync(p, JSON.stringify(c)); }
  ({ email, password } = JSON.parse(fs.readFileSync(p, 'utf8')));
}
const { token } = await (await fetch(`${API}/auth/login`, { method: 'POST', headers: J, body: JSON.stringify({ email, password }) })).json();
const auth = { Authorization: `Bearer ${token}`, ...J };
if (!COURSE) {
  const list = await (await fetch(`${API}/courses`, { headers: auth })).json();
  const found = (Array.isArray(list) ? list : []).find((c) => c.name === '实测·A18');
  COURSE = found?.id || (await (await fetch(`${API}/courses`, { method: 'POST', headers: auth, body: JSON.stringify({ name: '实测·A18', code: 'A18', semester: 'r04' }) })).json()).id;
}
const newNote = async (title) => (await (await fetch(`${API}/notes`, { method: 'POST', headers: auth, body: JSON.stringify({ course_id: COURSE, title }) })).json()).id;
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

// K: real keys, my f9_dbg8 sequence.
const armK = async (round) => { for (const ms of [120, 220, 260, 300, 340, 400]) for (let i = 0; i < 5; i += 1) {
  const id = await newNote(`K ${ms}-${i}`);
  await open(id); await clickTa(0); await sleep(800);
  await realKeys('abcdef'); await sleep(ms);
  await enter(); await sleep(150);
  await realKeys('xy'); await sleep(1500);
  const st = await state();
  await blurOutside(); await sleep(1800);
  const server = await serverUnits(id);
  const dom = st.tas.map((x) => x.v);
  add({ arm: 'K', name: `k${ms}-${i}`, round, dom, server, ro: st.tas.filter((t) => t.ro).length, ok: eq(dom, ['abcdef', 'xy']) && eq(server, ['abcdef', 'xy']) });
} };
// W: my f9_dbg7 sequence, composition event included.
const armW = async (round) => {
  const short = async (name, typer, ms) => {
    const id = await newNote(`W ${name}`);
    await open(id); await clickTa(0); await sleep(800);
    await typer('第一段甲乙丙'); await sleep(ms);
    await enter(); await sleep(120);
    await ins('第二行'); await sleep(1600);
    const st = await state();
    await blurOutside(); await sleep(1800);
    const server = await serverUnits(id);
    const dom = st.tas.map((x) => x.v);
    add({ arm: 'W', name, round, dom, server, ok: eq(dom, ['第一段甲乙丙', '第二行']) && eq(server, ['第一段甲乙丙', '第二行']) });
  };
  for (const ms of [200, 250, 280, 300, 320, 350, 400, 500]) { await short(`ime${ms}a`, ime, ms); await short(`ime${ms}b`, ime, ms); }
  for (const ms of [250, 300, 350]) await short(`chars${ms}`, typeChars, ms);
};
// H: my hash and caret matrices.
const armH = async (round) => {
  const expectUnits = (paras) => [...paras, '[heading_1]标题甲'];
  for (const arm of [{ name: 'one 300', paras: ['第一段'], gap: 300 }, { name: 'one 800', paras: ['第一段'], gap: 800 }, { name: 'one 3000', paras: ['第一段'], gap: 3000 }, { name: 'one 8000', paras: ['第一段'], gap: 8000 }, { name: 'two 300', paras: ['第一段', '第二段'], gap: 300 }, { name: 'two 3000', paras: ['第一段', '第二段'], gap: 3000 }, { name: 'wait3000 300', paras: ['第一段'], gap: 300, before: 3000 }]) {
    const id = await newNote(`H ${arm.name}`);
    await open(id); await clickTa(0);
    for (const [i, para] of arm.paras.entries()) { await ins(para); await sleep(arm.before || 300); await enter(); await sleep(i === arm.paras.length - 1 ? arm.gap : 500); }
    await typeHash(); await sleep(700);
    await ins('标题甲'); await sleep(2500);
    const st = await state();
    await blurOutside(); await sleep(2500);
    const server = await serverUnits(id);
    const dom = st.tas.map((t) => t.v);
    add({ arm: 'H', name: arm.name, round, dom, server, chapters: st.chapters, ok: eq(server.filter(Boolean), expectUnits(arm.paras)) && eq(dom.filter(Boolean), [...arm.paras, '标题甲']) });
  }
  const typeSlow = async (s) => { for (const c of s) { await b.cdp('Input.insertText', { text: c }); await sleep(180); } };
  for (const arm of [{ name: 'A', waitCreate: 0, typing: 'whole', enterAfter: 300 }, { name: 'B', waitCreate: 1500, typing: 'whole', enterAfter: 300 }, { name: 'C', waitCreate: 3000, typing: 'whole', enterAfter: 300 }, { name: 'D', waitCreate: 8000, typing: 'whole', enterAfter: 300 }, { name: 'E', waitCreate: 0, typing: 'slow', enterAfter: 300 }, { name: 'F', waitCreate: 3000, typing: 'slow', enterAfter: 150 }]) {
    const id = await newNote(`Hc ${arm.name}`);
    await open(id); await clickTa(0);
    await sleep(arm.waitCreate);
    if (arm.typing === 'whole') await ins('第一段甲乙丙'); else await typeSlow('第一段甲乙丙');
    await sleep(arm.enterAfter);
    await enter();
    await sleep(1750);
    await typeHash(); await sleep(700);
    await ins('标题甲'); await sleep(2200);
    const st = await state();
    await blurOutside(); await sleep(2500);
    const server = await serverUnits(id);
    const dom = st.tas.map((t) => t.v);
    add({ arm: 'H', name: `caret${arm.name}`, round, dom, server, chapters: st.chapters, ok: eq(server.filter(Boolean), ['第一段甲乙丙', '[heading_1]标题甲']) && eq(dom.filter(Boolean), ['第一段甲乙丙', '标题甲']) });
  }
};
const press = async (k, code, vk, modifiers = 0) => { await b.cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers }); await b.cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers }); };
const backspace = () => press('Backspace', 'Backspace', 8);
const left = () => press('ArrowLeft', 'ArrowLeft', 37);
const keysAt = async (t, gap) => { for (const c of t) { if (/[a-z]/.test(c)) await key(c, `Key${c.toUpperCase()}`, c.toUpperCase().charCodeAt(0), c); else await key(c, `Digit${c}`, c.charCodeAt(0), c); await sleep(gap); } };
const fresh = async (title) => { const id = await newNote(title); await open(id); await clickTa(0); await sleep(800); return id; };
const finish = async (id, expected, arm, name, round, extra = {}) => { await sleep(1500); const st = await state(); await blurOutside(); await sleep(1800); const server = await serverUnits(id); const dom = st.tas.map((x) => x.v); add({ arm, name, round, dom, server, expected, ok: eq(dom, expected) && eq(server, expected), ...extra }); };
// S: a long unbroken run of keys across the handoff, with an Enter in the middle.
const armS = async (round) => { for (const gap of [30, 60, 90, 140]) for (let i = 0; i < 4; i += 1) {
  const id = await fresh(`S ${gap}`);
  await keysAt('abcdefghijklmnopqrst', gap); await enter(); await sleep(gap); await keysAt('uvwxyz0123456789', gap);
  await finish(id, ['abcdefghijklmnopqrst', 'uvwxyz0123456789'], 'S', `s${gap}-${i}`, round);
} };
// B: edits around the handoff, where the caret is not at the end.
const armB = async (round) => { for (const pause of [200, 450, 700, 1000, 1500]) for (let i = 0; i < 2; i += 1) {
  let id = await fresh(`B bs ${pause}`);
  await keysAt('abcd', 60); await sleep(pause); await backspace(); await sleep(40); await backspace(); await sleep(40); await keysAt('xy', 60);
  await finish(id, ['abxy'], 'B', `backspace${pause}-${i}`, round);
  id = await fresh(`B left ${pause}`);
  await keysAt('abcd', 60); await left(); await sleep(30); await left(); await sleep(pause); await keysAt('xy', 60);
  await finish(id, ['abxycd'], 'B', `midcaret${pause}-${i}`, round);
  id = await fresh(`B split ${pause}`);
  await keysAt('abcd', 60); await left(); await sleep(30); await left(); await sleep(pause); await enter(); await sleep(60); await keysAt('xy', 60);
  await finish(id, ['ab', 'xycd'], 'B', `splitmid${pause}-${i}`, round);
} };
// D: several lines in the draft window, then later edits.
const armD = async (round) => { for (const gap of [30, 80, 150, 300]) for (let i = 0; i < 3; i += 1) {
  const id = await fresh(`D ${gap}`);
  for (const line of ['aa', 'bb', 'cc', 'dd']) { await keysAt(line, 40); await sleep(gap); await enter(); await sleep(gap); }
  await keysAt('ee', 40);
  await finish(id, ['aa', 'bb', 'cc', 'dd', 'ee'], 'D', `lines${gap}-${i}`, round);
} };
// T: the new stored shapes: trailing spaces and a trailing Enter, after a reload.
const armT = async (round) => {
  for (const [name, type, expected] of [['space', async () => { await keysAt('abc', 60); await key(' ', 'Space', 32, ' '); await sleep(60); }, ['abc ']], ['enter', async () => { await keysAt('abc', 60); await enter(); await sleep(60); }, ['abc', '']], ['spaceThenType', async () => { await keysAt('abc', 60); await key(' ', 'Space', 32, ' '); await sleep(1800); await keysAt('de', 60); }, ['abc de']], ['twoEnters', async () => { await keysAt('abc', 60); await enter(); await sleep(60); await enter(); await sleep(60); }, ['abc', '', '']]]) {
    const id = await fresh(`T ${name}`);
    await type(); await sleep(2200);
    const before = await state(); await blurOutside(); await sleep(2200);
    const raw = await serverBlocks(id);
    await open(id); await sleep(1500);
    const after = await state();
    const dom = after.tas.map((x) => x.v);
    add({ arm: 'T', name, round, domBefore: before.tas.map((x) => x.v), domAfterReload: dom, server: raw.flatMap((x) => x.units), plain: raw.map((x) => x.plain), expected, alert: after.alert, ok: eq(dom, expected) && eq(raw.flatMap((x) => x.units), expected) });
  }
};
// P: a heading nobody asked for, and a heading somebody did.
const armP = async (round) => {
  const heads = async (id, name, expected, extra = {}) => { await sleep(2000); const st = await state(); await blurOutside(); await sleep(2200); const server = await serverUnits(id); add({ arm: 'P', name, round, dom: st.tas.map((x) => x.v), server, chapters: st.chapters, expected, ok: eq(server, expected), ...extra }); };
  let id = await fresh('P 粘贴末行井号'); await ins('第一行内容\n# 这是一条注释'); await heads(id, 'pasted last line "# "', ['第一行内容', '# 这是一条注释']);
  id = await fresh('P 粘贴中间井号'); await ins('第一行\n# 中间\n第三行'); await heads(id, 'pasted middle line "# "', ['第一行', '# 中间', '第三行']);
  id = await fresh('P 首行键入'); await typeHash(); await sleep(120); await keysAt('title', 60); await heads(id, 'first line typed "# title"', ['[heading_1]title']);
  id = await fresh('P 首行键入回车'); await typeHash(); await sleep(120); await keysAt('title', 60); await sleep(200); await enter(); await sleep(150); await keysAt('body', 60); await heads(id, 'first line "# title", Enter, body', ['[heading_1]title', 'body']);
  id = await fresh('P 次行等够'); await keysAt('abc', 60); await sleep(2500); await enter(); await sleep(1500); await typeHash(); await sleep(150); await keysAt('head', 60); await heads(id, 'settled second line "# head"', ['abc', '[heading_1]head']);
  id = await fresh('P 次行快'); await keysAt('abc', 60); await sleep(250); await enter(); await sleep(150); await typeHash(); await sleep(150); await keysAt('head', 60); await heads(id, 'fast second line "# head"', ['abc', '[heading_1]head']);
  id = await fresh('P 次行快带正文'); await keysAt('abc', 60); await sleep(250); await enter(); await sleep(150); await typeHash(); await sleep(150); await keysAt('head', 60); await sleep(150); await enter(); await sleep(150); await keysAt('body', 60); await heads(id, 'fast "# head" then body', ['abc', '[heading_1]head', 'body']);
};
// M: the same text in different notes without a reload: the runtime keeps its memory between notes.
const armM = async (round) => {
  const a = await newNote('M 甲'); const c = await newNote('M 乙');
  await open(a); await clickTa(0); await sleep(800);
  await keysAt('sametext', 60); await sleep(300); await enter(); await sleep(150); await keysAt('line', 60); await sleep(2000); await blurOutside(); await sleep(2000);
  const toNext = async (id) => { const link = `location.hash='#/notes/${id}'; 1`; await b.ev(link); await sleep(2500); };
  await toNext(c); await clickTa(0); await sleep(800);
  await keysAt('sametext', 60); await sleep(300); await enter(); await sleep(150); await keysAt('line', 60); await sleep(2000); await blurOutside(); await sleep(2000);
  const ra = await serverBlocks(a); const rc = await serverBlocks(c);
  const idsA = ra.flatMap((x) => x.ids); const idsC = rc.flatMap((x) => x.ids);
  const shared = idsA.filter((x) => idsC.includes(x));
  // Edit the second note, then read the first again from the server and the screen.
  await open(c); await sleep(1200); let st = await state(); await b.click(st.tas[0].x, st.tas[0].y); await sleep(300); await end(); await keysAt('zz', 60); await sleep(400); await blurOutside(); await sleep(2000);
  const ra2 = (await serverBlocks(a)).flatMap((x) => x.units); const rc2 = (await serverBlocks(c)).flatMap((x) => x.units);
  add({ arm: 'M', name: 'two notes same text', round, sharedUnitIds: shared.length, a: ra2, c: rc2, ok: eq(ra2, ['sametext', 'line']) && eq(rc2, ['sametextzz', 'line']) && shared.length === 0 });
  // A second block in the same note with the same text, if the surface offers one.
  const d = await newNote('M 丙'); await open(d); await clickTa(0); await sleep(800);
  await keysAt('dup', 60); await sleep(2200); await blurOutside(); await sleep(1800);
  await dbl(700, 900); await sleep(1200); st = await state();
  const blocksBefore = (await serverBlocks(d)).length;
  await keysAt('dup', 60); await sleep(2200); await blurOutside(); await sleep(2000);
  const rd = await serverBlocks(d);
  const idsD = rd.flatMap((x) => x.ids);
  add({ arm: 'M', name: 'second block same text', round, blocksBefore, blocks: rd.length, units: rd.flatMap((x) => x.units), duplicateIds: idsD.length - new Set(idsD).size, ok: idsD.length === new Set(idsD).size });
};
// U: undo right after the handoff.
const armU = async (round) => { for (const pause of [300, 1500]) for (let i = 0; i < 2; i += 1) {
  const id = await fresh(`U ${pause}`);
  await keysAt('abc', 60); await sleep(pause); await enter(); await sleep(150); await keysAt('def', 60); await sleep(pause);
  await press('z', 'KeyZ', 90, 2); await sleep(1200);
  const undone = (await state()).tas.map((x) => x.v);
  await press('z', 'KeyZ', 90, 2); await sleep(1200);
  const undone2 = (await state()).tas.map((x) => x.v);
  await press('y', 'KeyY', 89, 2); await sleep(1200);
  const redone = (await state()).tas.map((x) => x.v);
  await blurOutside(); await sleep(2000);
  const server = await serverUnits(id);
  const after = (await state()).tas.map((x) => x.v);
  add({ arm: 'U', name: `undo${pause}-${i}`, round, undone, undone2, redone, dom: after, server, ok: eq(after, server) });
} };
// L: text after "# " in a block that has already been saved: when does it land, by which kind of input, and where is the focus?
const armL = async (round) => {
  const focusNow = () => b.ev(`(()=>{const a=document.activeElement;return a?.tagName==='TEXTAREA'?{unit:a.dataset.textUnitId?.slice(0,6),ro:a.readOnly,v:a.value}:{tag:a?.tagName}})()`);
  for (const via of ['keys', 'insert']) for (const lines of [1, 2]) for (const ms of [100, 300, 500, 700, 1000, 1500, 2500, 4000]) {
    const id = await fresh(`L ${via} ${lines} ${ms}`);
    const paras = lines === 2 ? ['aaa', 'bbb'] : ['aaa'];
    for (const p of paras) { await keysAt(p, 60); await sleep(2500); await enter(); await sleep(1500); }
    await typeHash();
    await sleep(ms);
    const focus = await focusNow();
    if (via === 'keys') await keysAt('head', 40); else await ins('标题');
    await sleep(2500);
    const st = await state();
    await blurOutside(); await sleep(2200);
    const server = (await serverUnits(id));
    const word = via === 'keys' ? 'head' : '标题';
    const expected = [...paras, `[heading_1]${word}`];
    add({ arm: 'L', name: `${via}-${lines}-${ms}`, round, focus, dom: st.tas.map((x) => x.v), server, expected, ok: eq(server, expected) });
  }
};
// N: a person typing a heading at ordinary speed: the keys straddle the structure commit.
const armN = async (round) => {
  const focusNow = () => b.ev(`(()=>{const a=document.activeElement;return a?.tagName==='TEXTAREA'?(a.readOnly?'ro':'rw'):a?.tagName})()`);
  for (const gap of [80, 120, 160, 220]) for (let i = 0; i < 3; i += 1) {
    const id = await fresh(`N ${gap}`);
    await keysAt('aaa', 60); await sleep(2500); await enter(); await sleep(1500);
    await typeHash();
    const seen = [];
    for (const c of 'abcdefghijkl') { await key(c, `Key${c.toUpperCase()}`, c.toUpperCase().charCodeAt(0), c); seen.push(await focusNow()); await sleep(gap); }
    await sleep(2500);
    const st = await state(); await blurOutside(); await sleep(2200);
    const server = await serverUnits(id);
    const expected = ['aaa', '[heading_1]abcdefghijkl'];
    add({ arm: 'N', name: `human${gap}-${i}`, round, dom: st.tas.map((x) => x.v), server, expected, focusAtKeys: seen.join(','), ok: eq(server, expected) });
  }
  // The same for a composition committed in pieces, the way Chinese input arrives.
  for (const gap of [300, 600]) for (let i = 0; i < 3; i += 1) {
    const id = await fresh(`Ni ${gap}`);
    await keysAt('aaa', 60); await sleep(2500); await enter(); await sleep(1500);
    await typeHash();
    const pieces = ['现值', '公式', '推导'];
    for (const p of pieces) { await sleep(gap); await ins(p); }
    await sleep(2500);
    const st = await state(); await blurOutside(); await sleep(2200);
    const server = await serverUnits(id);
    const expected = ['aaa', '[heading_1]现值公式推导'];
    add({ arm: 'N', name: `ime${gap}-${i}`, round, dom: st.tas.map((x) => x.v), server, expected, ok: eq(server, expected) });
  }
};
// l: the focus gap, narrowed.
const armLs = async (round) => {
  const focusNow = () => b.ev(`(()=>{const a=document.activeElement;return a?.tagName==='TEXTAREA'?(a.readOnly?'ro':'rw'):a?.tagName})()`);
  for (const via of ['keys', 'insert']) for (const ms of [300, 500, 600, 700, 800, 900, 1100]) {
    const id = await fresh(`l ${via} ${ms}`);
    await keysAt('aaa', 60); await sleep(2500); await enter(); await sleep(1500);
    await typeHash(); await sleep(ms);
    const focus = await focusNow();
    if (via === 'keys') await keysAt('head', 40); else await ins('标题');
    await sleep(2500);
    await blurOutside(); await sleep(2200);
    const server = await serverUnits(id);
    const expected = ['aaa', `[heading_1]${via === 'keys' ? 'head' : '标题'}`];
    add({ arm: 'l', name: `${via}-${ms}`, round, focus, server, expected, ok: eq(server, expected) });
  }
};
// V: what is on screen after an Enter with nothing typed, and where the next key goes.
const armV = async (round) => {
  for (const pause of [600, 2200, 5000]) {
    const id = await fresh(`V ${pause}`);
    await keysAt('abc', 60); await enter(); await sleep(pause);
    const boxes = await b.ev(`[...document.querySelectorAll('textarea')].filter(t=>t.getBoundingClientRect().width>200&&!t.closest('[class*=Title],[class*=title],[class*=escription]')).map(t=>{const r=t.getBoundingClientRect();const s=getComputedStyle(t);return {v:t.value,y:Math.round(r.y),h:Math.round(r.height),vis:s.visibility,op:s.opacity,color:s.color,unit:t.dataset.textUnitId||null,focused:t===document.activeElement}})`);
    const r = await b.cdp('Page.captureScreenshot', { format: 'jpeg', quality: 70 });
    fs.writeFileSync(`${OUT}/V-${pause}.jpg`, Buffer.from(r.result.data, 'base64'));
    await keysAt('xy', 60); await sleep(2200);
    const st = await state(); await blurOutside(); await sleep(2000);
    const server = await serverUnits(id);
    const expected = ['abc', 'xy'];
    add({ arm: 'V', name: `pause${pause}`, round, boxes, dom: st.tas.map((x) => x.v), server, expected, ok: eq(server, expected) });
  }
};
// R: repeats of the few results that decide the verdict.
const armR = async (round) => {
  const after = async (id, name, expected, extra = {}) => { await sleep(2000); const st = await state(); await blurOutside(); await sleep(2200); const server = await serverUnits(id); add({ arm: 'R', name, round, dom: st.tas.map((x) => x.v), server, expected, ok: eq(server, expected), ...extra }); };
  for (let i = 0; i < 8; i += 1) {
    let id = await fresh('R 快标题'); await keysAt('abc', 60); await sleep(250); await enter(); await sleep(150); await typeHash(); await sleep(150); await keysAt('head', 60);
    await after(id, 'fastHash', ['abc', '[heading_1]head']);
    id = await fresh('R 快标题正文'); await keysAt('abc', 60); await sleep(250); await enter(); await sleep(150); await typeHash(); await sleep(150); await keysAt('head', 60); await sleep(150); await enter(); await sleep(150); await keysAt('body', 60);
    await after(id, 'fastHashBody', ['abc', '[heading_1]head', 'body']);
    id = await fresh('R 连写'); for (const line of ['aa', 'bb', 'cc', 'dd']) { await keysAt(line, 40); await sleep(300); await enter(); await sleep(300); } await keysAt('ee', 40);
    await after(id, 'lines300', ['aa', 'bb', 'cc', 'dd', 'ee']);
    id = await fresh('R 回车'); await keysAt('abc', 60); await enter(); await sleep(60); await sleep(2200);
    const boxes = (await state()).tas.map((x) => x.v);
    await after(id, 'trailingEnter', ['abc', ''], { boxes });
    id = await fresh('R 空格'); await keysAt('abc', 60); await key(' ', 'Space', 32, ' '); await sleep(1800); await keysAt('de', 60);
    await after(id, 'spaceThenType', ['abc de']);
    id = await fresh('R 句子'); await keysAt('hello', 60); await key(' ', 'Space', 32, ' '); await sleep(700); await keysAt('world', 60); await key(' ', 'Space', 32, ' '); await sleep(1500); await keysAt('again', 60);
    await after(id, 'sentence', ['hello world again']);
  }
};
const ARM = { K: armK, W: armW, H: armH, S: armS, B: armB, D: armD, T: armT, P: armP, M: armM, U: armU, L: armL, N: armN, l: armLs, V: armV, R: armR };
for (let round = 0; round < Number(ROUNDS); round += 1) for (const a of ARMS.split(',')) if (ARM[a]) await ARM[a](round);
const by = {}; for (const r of rows) { const g = (by[r.arm] ||= { n: 0, bad: 0 }); g.n += 1; if (!r.ok) g.bad += 1; }
const summary = { label: LABEL, origin: ORIGIN, by, errors: errors.length, firstErrors: errors.slice(0, 3) };
fs.writeFileSync(`${OUT}/summary.json`, JSON.stringify(summary, null, 1));
console.log('SUMMARY', JSON.stringify(summary));
await b.close();
