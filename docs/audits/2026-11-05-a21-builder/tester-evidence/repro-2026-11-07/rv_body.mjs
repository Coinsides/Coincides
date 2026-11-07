// Review repros: the independent review's surviving findings, driven in the real app against the real backend.
// Requests are steered inside this Chrome only (Fetch at the Request stage); the server is untouched.
const ctrl = (k, code, vk, commands) => b.cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers: 2, commands }).then(() => b.cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers: 2 }));
const undo = () => ctrl('z', 'KeyZ', 90, ['undo']);
const home = () => press('Home', 'Home', 36);
const goHash = (id) => b.ev(`location.hash='#/notes/${id}';1`);
const typeText = async (t, gap = 90) => { for (const c of t) { if (c === ' ') await key(' ', 'Space', 32, ' '); else await key(c, `Key${c.toUpperCase()}`, c.toUpperCase().charCodeAt(0), c); await sleep(gap); } };
const short = (u) => u.replace(/^.*\/api/, '').replace(/[0-9a-f-]{36}/g, ':id').replace(/\?.*$/, '');
const summarize = (pd) => { try { const j = JSON.parse(pd); const units = j?.block?.content_json?.text_flow?.units || j?.content_json?.text_flow?.units; if (Array.isArray(units)) return units.map((u) => `${u.writing_role && u.writing_role !== 'paragraph' ? `[${u.writing_role}]` : ''}${u.text}`).join('|'); return ''; } catch { return ''; } };
let rule = () => 'continue'; const held = []; const net = []; let t0 = Date.now();
const mark = () => { t0 = Date.now(); net.length = 0; };
b.on('Fetch.requestPaused', (p) => {
  const m = p.request.method; const u = short(p.request.url);
  if (m === 'GET' || m === 'OPTIONS' || /source-anchors/.test(u)) { b.cdp('Fetch.continueRequest', { requestId: p.requestId }).catch(() => {}); return; }
  let act = 'continue'; try { act = rule({ m, u }) || 'continue'; } catch { act = 'continue'; }
  const tag = act === 'continue' ? '' : ` [${typeof act === 'object' ? `delay${act.delay}` : act}]`;
  net.push(`${Date.now() - t0} ${m} ${u}${tag}${/text-save/.test(u) && p.request.postData ? ` ${summarize(p.request.postData)}` : ''}`);
  if (act === 'hold') held.push(p.requestId);
  else if (act === '500') b.cdp('Fetch.fulfillRequest', { requestId: p.requestId, responseCode: 500, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }], body: Buffer.from('{"error":"injected"}').toString('base64') }).catch(() => {});
  else if (typeof act === 'object' && act.delay) setTimeout(() => b.cdp('Fetch.continueRequest', { requestId: p.requestId }).catch(() => {}), act.delay);
  else b.cdp('Fetch.continueRequest', { requestId: p.requestId }).catch(() => {});
});
await b.cdp('Fetch.enable', { patterns: [{ urlPattern: '*/api/*', requestStage: 'Request' }] });
const release = async () => { while (held.length) await b.cdp('Fetch.continueRequest', { requestId: held.shift() }).catch(() => {}); };
const WIN = `(()=>{const t=document.querySelector('textarea[data-structure-typing-buffer]');const n=document.querySelector('[data-structure-typing-notice]');const eds=[...document.querySelectorAll('textarea[data-runtime-textflow-editor="true"]')].filter(e=>e.getBoundingClientRect().width>0);const a=document.activeElement;return {buf:t?t.value:null,boxes:window.__bufs||0,focusBuf:a===t,active:(a?.tagName||'')+(a?.dataset?.runtimeTextflowEditor?':editor':'')+(a?.value!==undefined?'='+a.value.slice(0,40)+'@'+a.selectionStart:''),notice:n?n.innerText.slice(0,90):null,eds:eds.map(e=>e.value),alerts:[...new Set([...(window.__alerts||[]),...[...document.querySelectorAll('[role=alert],[class*=toast],[class*=Toast]')].map(x=>x.innerText.replace(/\\s+/g,' ').slice(0,90))].filter(Boolean))].slice(0,6),stored:Object.keys(localStorage).filter(k=>k.startsWith('coincides:unplaced')).map(k=>localStorage.getItem(k).slice(0,160))}})()`;
const win = () => b.ev(WIN);
// Count every words box that appears and every alert text, from the moment this is called on the current page.
const watch = () => b.ev(`(()=>{window.__bufs=0;window.__alerts=[];const grab=()=>{for(const x of document.querySelectorAll('[role=alert],[class*=toast],[class*=Toast]')){const s=x.innerText.replace(/\\s+/g,' ').slice(0,90);if(s&&!window.__alerts.includes(s))window.__alerts.push(s)}};new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes){if(n.nodeType!==1)continue;if(n.matches?.('textarea[data-structure-typing-buffer]')||n.querySelector?.('textarea[data-structure-typing-buffer]'))window.__bufs++}grab()}).observe(document.body,{childList:true,subtree:true,characterData:true});1})()`);
const shot = async (name) => { const r = await b.cdp('Page.captureScreenshot', { format: 'jpeg', quality: 70 }); fs.writeFileSync(`${OUT}/${name}.jpg`, Buffer.from(r.result.data, 'base64')); };
const blocksOf = async (id) => (await serverBlocks(id)).map((x) => x.units);
const flat = (bl) => JSON.stringify(bl);
const row = (name, id, data, ok) => add({ arm: 'RV', name, id, ...data, net: [...net], ok });
const prep = async (title) => { const id = await fresh(title); await typeText('warmup', 50); await sleep(200); await enter(); await sleep(2500); return id; };
const scenario = async (name, fn) => {
  rule = () => 'continue'; held.length = 0; mark();
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
// A1. Item 2 at human timing, no request steering: '# abcd', Enter, 'body', then a click on the other note's tab
// 300 ms or 1 s after the Enter. A0 is the same with no click, to measure how long the window really is.
for (const gap of [300, 1000, 0]) for (let i = 0; i < 4; i += 1) {
  const name = gap ? `A1-natural-${gap}-${i}` : `A0-windowOnly-${i}`;
  if (!want(name)) continue;
  await scenario(name, async () => {
    const id = await newNote(`R natural ${gap} ${i}`);
    await arriveAndWarm(id);
    await watch(); await traceOn(); mark();
    await typeHash(); await typeText('abcd');
    const tE = Date.now(); await enter(); await sleep(40); await typeText('body', 50);
    const c = gap ? await tabAt('R other') : null;
    if (gap) { const wait = gap - (Date.now() - tE); if (wait > 0) await sleep(wait); if (c) await b.click(c.x, c.y); }
    await sleep(6000);
    const tr = await traceGet(); const away = await win(); const hashAway = await b.ev('location.hash');
    if (gap) { await goHash(id); await sleep(5000); } else { await blurOutside(); await sleep(2500); }
    const back = await win();
    const blocks = await blocksOf(id); const text = flat(blocks);
    row(name, id, { gap, tabFound: gap ? Boolean(c) : null, leftNote: !hashAway.includes(id), tr, away, back, blocks }, text.includes('abcd') && text.includes('body'));
  });
}
// A2. The same leave with the window held open deterministically (unit-transfer paused until after the click).
for (const [variant, withEnter] of [['enter', true], ['noEnter', false]]) {
  const name = `A2-heldLeave-${variant}-0`;
  if (!want(name)) continue;
  await scenario(name, async () => {
    const id = await newNote(`R leave ${variant}`);
    await arriveAndWarm(id);
    await watch(); await traceOn(); mark();
    rule = ({ u }) => (/unit-transfer/.test(u) ? 'hold' : 'continue');
    await typeHash(); await typeText('abcd');
    if (withEnter) { await enter(); await sleep(60); await typeText('body'); }
    await sleep(150);
    const during = await win();
    const c = await tabAt('R other');
    if (c) await b.click(c.x, c.y);
    await sleep(800);
    const hashAway = await b.ev('location.hash');
    rule = () => 'continue'; await release();
    await sleep(4000);
    const away = await win();
    await goHash(id); await sleep(5000);
    const back = await win();
    const blocks = await blocksOf(id);
    const text = flat(blocks);
    row(name, id, { tabFound: Boolean(c), leftNote: hashAway.includes(other), during, tr: await traceGet().catch(() => null), away, back, blocks }, text.includes('abcd') && (!withEnter || text.includes('body')));
  });
}

// B. Review commit finding 1 / buffer finding 2, path one: the first structure's reorder answers 500 once. With Enter
// in the window the words then go to a second structure whose wait on writes rejects before its first edit.
for (const withEnter of [true, true, false]) {
  const name = `B-reorder500-${withEnter ? 'enter' : 'noEnter'}-${rows.filter((r) => r.name.startsWith(`B-reorder500-${withEnter ? 'enter' : 'noEnter'}`)).length}`;
  if (!want(name)) continue;
  await scenario(name, async () => {
    const id = await prep(`R reorder500 ${withEnter}`);
    await watch(); mark();
    let holdUT = true; let reorders = 0;
    rule = ({ u }) => { if (/unit-transfer/.test(u)) return holdUT ? 'hold' : 'continue'; if (/blocks\/reorder/.test(u) && reorders++ === 0) return '500'; return 'continue'; };
    await typeHash(); await typeText('abcd');
    if (withEnter) { await enter(); await sleep(60); await typeText('body'); }
    await sleep(150);
    const during = await win();
    holdUT = false; await release();
    await sleep(1500); const s1 = await win();
    await sleep(4000); const s5 = await win(); await shot(`${name}-screen`);
    await blurOutside(); await sleep(2500);
    const blocks = await blocksOf(id);
    await open(id); await sleep(3500);
    const reopened = await win(); const blocksAfter = await blocksOf(id); await shot(`${name}-reloaded`);
    const text = flat(blocksAfter) + JSON.stringify(reopened.stored) + (reopened.buf || '');
    row(name, id, { during, s1, s5, blocks, reopened, blocksAfter }, text.includes('abcd') && (!withEnter || text.includes('body')));
  });
}

// C. Same finding, path two, no Enter: the Nth text-save after the '#' answers 500 once (the role edit's save is the
// third on the fixed build and the second on the old one; both are tried on both).
for (const n of [2, 3]) for (let i = 0; i < 2; i += 1) {
  const name = `C-save500-n${n}-${i}`;
  if (!want(name)) continue;
  await scenario(name, async () => {
    const id = await prep(`R save500 ${n} ${i}`);
    await watch(); mark();
    let saves = 0;
    rule = ({ u }) => { if (/text-save/.test(u)) { saves += 1; if (saves === n) return '500'; } return 'continue'; };
    await typeHash(); await typeText('kept');
    await sleep(1500); const s1 = await win();
    await sleep(4000); const s5 = await win();
    await blurOutside(); await sleep(2500);
    const blocks = await blocksOf(id);
    await open(id); await sleep(3500);
    const reopened = await win(); const blocksAfter = await blocksOf(id);
    const text = flat(blocksAfter) + JSON.stringify(reopened.stored) + (reopened.buf || '');
    row(name, id, { s1, s5, blocks, reopened, blocksAfter }, text.includes('kept'));
  });
}

// D. Critic scenario five: Enter in the window; once the first structure has sent its reorder, the next text-save and
// everything after it hang for 12 s, so the second structure waits on writes before its first edit.
for (let i = 0; i < 2; i += 1) {
  const name = `D-stallSecond-${i}`;
  if (!want(name)) continue;
  await scenario(name, async () => {
    const id = await prep(`R stall second ${i}`);
    await watch(); mark();
    let holdUT = true; let sawReorder = false; let holdAll = false;
    rule = ({ u }) => { if (holdAll) return 'hold'; if (/unit-transfer/.test(u) && holdUT) return 'hold'; if (/blocks\/reorder/.test(u)) { sawReorder = true; return 'continue'; } if (sawReorder && /text-save/.test(u)) { holdAll = true; return 'hold'; } return 'continue'; };
    await typeHash(); await typeText('two'); await enter(); await sleep(60); await typeText('body');
    await sleep(150);
    holdUT = false; await release();
    await sleep(2500); const s2 = await win();
    await sleep(10500); const s13 = await win(); await shot(`${name}-screen`);
    rule = () => 'continue'; await release();
    await sleep(5000); const after = await win();
    await blurOutside(); await sleep(2500);
    const blocks = await blocksOf(id);
    await open(id); await sleep(3500);
    const reopened = await win(); const blocksAfter = await blocksOf(id); await shot(`${name}-reloaded`);
    const text = flat(blocksAfter) + JSON.stringify(reopened.stored) + (reopened.buf || '');
    row(name, id, { holdAll, s2, s13, after, blocks, reopened, blocksAfter }, text.includes('two') && text.includes('body'));
  });
}

// E. Buffer finding 5: '# ' typed at the start of an existing paragraph, more words typed, every text-save held 12 s.
for (let i = 0; i < 2; i += 1) {
  const name = `E-caretStart-${i}`;
  if (!want(name)) continue;
  await scenario(name, async () => {
    const id = await fresh(`R caret start ${i}`);
    await typeText('intro', 60); await sleep(3000);
    const s = await state(); await b.click(s.tas[0].x, s.tas[0].y); await sleep(300); await home(); await sleep(200);
    await watch(); mark();
    rule = ({ u }) => (/text-save/.test(u) ? 'hold' : 'continue');
    await typeHash(); await typeText('big ');
    await sleep(300); const during = await win();
    await sleep(12000); const s12 = await win();
    rule = () => 'continue'; await release();
    await sleep(5000); const after = await win();
    await blurOutside(); await sleep(2500);
    const blocks = await blocksOf(id);
    row(name, id, { during, s12, after, blocks }, /big intro/.test(flat(blocks)));
  });
}

// F. Buffer finding 6: the words box placed by unit id alone. Body block's unit id also exists in the first block.
if (want('F-sameId')) await scenario('F-sameId-0', async () => {
  const id = await prep('R same id');
  await typeHash(); await typeText('head'); await sleep(3500); await enter(); await sleep(60); await typeText('body'); await sleep(4000);
  let s = await state(); await b.click(s.tas[0].x + 200, s.tas[0].y); await sleep(300); await press('End', 'End', 35);
  await enter(); await sleep(60); await typeText('second'); await enter(); await sleep(60); await typeText('third'); await sleep(4000);
  await blurOutside(); await sleep(2000);
  const before = await serverBlocks(id);
  s = await state();
  const bodyTa = s.tas.find((t) => t.v === 'body');
  await b.click(bodyTa.x, bodyTa.y); await sleep(300); await home(); await sleep(200);
  await watch(); mark();
  rule = () => 'hold';
  await typeHash(); await typeText('xy'); await sleep(400);
  const rects = await b.ev(`(()=>{const R=(e)=>{const r=e.getBoundingClientRect();return {top:Math.round(r.top),left:Math.round(r.left),h:Math.round(r.height)}};const box=document.querySelector('textarea[data-structure-typing-buffer]');const eds=[...document.querySelectorAll('textarea[data-runtime-textflow-editor="true"]')].filter(e=>e.getBoundingClientRect().width>0).map(e=>({unit:e.dataset.textUnitId,block:(e.dataset.blockId||e.closest('[data-block-id]')?.dataset.blockId||'').slice(0,8),v:e.value,...R(e)}));return {box:box?{v:box.value,...R(box)}:null,eds}})()`);
  await shot('F-sameId-window');
  rule = () => 'continue'; await release();
  await sleep(5000);
  const blocks = await blocksOf(id);
  const ids = (await serverBlocks(id)).map((x) => x.ids);
  const target = rects.eds.find((e) => e.v === 'body' || e.v === '#body' || e.v === '' && e.unit === bodyTa?.unit);
  const over = rects.box ? rects.eds.filter((e) => Math.abs(e.top - rects.box.top) <= 4).map((e) => e.v) : [];
  row('F-sameId-0', id, { before: before.map((x) => ({ units: x.units, ids: x.ids })), rects, over, blocks, ids }, Boolean(rects.box) && over.includes('body'));
});

// I. Buffer finding 3: words placed into another block's unit with the same per-block id. The first block gains
// lines (its ids run on inside that block), the body block gets a new line whose id the first block also has, and
// '# kept' is typed there while the extraction answer is held past the 10 s watchdog, then let through.
if (want('I-wrongBlock')) await scenario('I-wrongBlock-0', async () => {
  const id = await prep('R wrong block');
  await typeHash(); await typeText('head'); await sleep(3500); await enter(); await sleep(60); await typeText('body'); await sleep(4000);
  let s = await state(); await b.click(s.tas[0].x + 200, s.tas[0].y); await sleep(300); await press('End', 'End', 35);
  for (const w of ['second', 'third', 'fourth']) { await enter(); await sleep(60); await typeText(w); }
  await sleep(4000); await blurOutside(); await sleep(2000);
  s = await state(); const bodyTa = s.tas.find((t) => t.v === 'body');
  await b.click(bodyTa.x + 200, bodyTa.y); await sleep(300); await press('End', 'End', 35);
  await enter(); await sleep(2500);
  const before = await serverBlocks(id);
  await watch(); mark();
  rule = ({ u }) => (/unit-transfer/.test(u) ? 'hold' : 'continue');
  await typeHash(); await typeText('kept');
  await sleep(12500); const s12 = await win(); await shot('I-wrongBlock-held');
  rule = () => 'continue'; await release();
  await sleep(5000); const after = await win(); await shot('I-wrongBlock-after');
  await blurOutside(); await sleep(2500);
  const sb = await serverBlocks(id);
  const blocks = sb.map((x) => x.units);
  row('I-wrongBlock-0', id, { before: before.map((x) => ({ units: x.units, ids: x.ids })), s12, after, blocks, ids: sb.map((x) => x.ids) }, /kept/.test(flat(blocks)) && !/(second|third|fourth)kept/.test(flat(blocks)));
});

// G. Leads finding 4: a heading made from draft text at the handoff, then Undo, then one more letter.
for (let i = 0; i < 2; i += 1) {
  const name = `G-draftUndo-${i}`;
  if (!want(name)) continue;
  await scenario(name, async () => {
    const id = await newNote(`R draft undo ${i}`); await open(id); await clickTa(0); await sleep(800);
    mark(); let creates = 0;
    rule = ({ m, u }) => (m === 'POST' && /^\/notes\/:id\/blocks$/.test(u) && creates++ === 0 ? 'hold' : 'continue');
    await typeText('intro', 60); await enter(); await sleep(60); await typeHash(); await typeText('title', 60);
    await sleep(300); const draft = await state();
    rule = () => 'continue'; await release();
    await sleep(4000); const s1 = await win(); const b1 = await blocksOf(id);
    await undo(); await sleep(1500); const s2 = await win();
    await typeText('s'); await sleep(3000); const s3 = await win();
    await blurOutside(); await sleep(2500);
    const blocks = await blocksOf(id);
    row(name, id, { draft: draft.tas.map((t) => t.v), s1, b1, s2, s3, blocks }, !/tits/.test(flat(blocks)));
  });
}

// H. Critic scenario one, for my 1-of-28 loss: every non-GET after the '#' is delayed 700 ms, so the window runs long.
// Arm U leaves the page (full navigation) about 5 s after the last key, as my arrival harness did; arm W first waits
// until the words box is gone.
const floor = await newNote('R floor');
for (const arm of ['U', 'W']) for (let i = 0; i < 3; i += 1) {
  const name = `H-unload${arm}-${i}`;
  if (!want(name)) continue;
  await scenario(name, async () => {
    const id = await newNote(`R unload ${arm} ${i}`);
    await open(floor); await sleep(1500); await goHash(id); await sleep(2500);
    await clickTa(0); await sleep(800); await typeText('warmup', 50); await sleep(200); await enter(); await sleep(2500);
    await watch(); mark();
    rule = () => ({ delay: 700 });
    await typeHash(); await typeText('head');
    await sleep(2500); const s25 = await win();
    await blurOutside(); await sleep(2400);
    const s49 = await win(); const blocks49 = await blocksOf(id);
    let waited = 0;
    if (arm === 'W') { while (waited < 30000) { const w = await win(); if (w.buf === null) break; await sleep(250); waited += 250; } await sleep(1500); }
    const netAtLeave = [...net];
    await b.cdp('Page.navigate', { url: `${ORIGIN}/?r=${Date.now()}#/notes/${floor}` });
    rule = () => 'continue';
    await sleep(15000);
    const blocks = await blocksOf(id);
    const stored = await b.ev(`Object.keys(localStorage).filter(k=>k.startsWith('coincides:unplaced')).length`);
    row(name, id, { s25, s49, blocks49, waited, netAtLeave, blocks, stored }, flat(blocks).includes('head'));
  });
}

fs.writeFileSync(`${OUT}/summary.json`, JSON.stringify({ total: rows.length, bad: rows.filter((r) => !r.ok).map((r) => r.name) }, null, 1));
console.log(`DONE ${LABEL}: ${rows.length} rows, bad ${rows.filter((r) => !r.ok).length}`);
log.end(); await b.close(); process.exit(0);
