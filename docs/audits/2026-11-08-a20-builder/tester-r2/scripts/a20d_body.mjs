// A-20 arms, fourth set (Tester, 2026-11-08): the sentences of the builder's manual section draft
// (ops packages/a20-idle-save/MANUAL-SECTION.md). Same file before and after; the pre numbers are reference only where
// the sentence is new behaviour.
//   HASHFAIL-<hash|paste>-i : every text-save answers 500; type words (no Enter); 300 ms; leave by script hash or by a
//        same-document paste. Manual: "If that save fails, you stay on the note and see 'Changes could not be saved.
//        Please retry before leaving the note.'" Read: where, alerts, editor; then network back + click away (or come
//        back): on the server exactly once?
//   SWITCH-i : four rounds of (type a word, 300 ms, hash to the other note, 2 s, hash back, 2.5 s, click the line end).
//        Manual: "Moving between two notes no longer shows the false 'Changes could not be saved' message when nothing
//        failed." and "What you typed is saved before the other note opens." Read: that toast count; each word on the
//        server exactly once.
//   GONEFAIL-<hash|paste|back>-i : the leave-time text-save is held at request stage and answered 500 after 2.5 s.
//        back (11-08): the save really fails, so 'did not reach the server ... kept on this device' is a TRUE message
//        (allowed, at most once per appearance = goneN); 'could not be saved / Please retry' is the false one.
//        back = the browser's Back (Page.navigateToHistoryEntry) to the other note in the same document. Manual: "If a
//        save sent while leaving turns out to have failed after you have gone, you see: 'Your last edit did not reach
//        the server. It is kept on this device: open the note again to recover it.'" Read: where, alerts; reopen A:
//        banner / box / stored kept words; Apply if offered; 8 s later: words on the server exactly once?
//   ACCT401-i : text-save answers 401, click away (the app goes to sign in); the tab then unloads (about:blank). A second
//        scratch account (B, this local backend only) signs in on the same browser in a new tab and opens B's own note
//        and the home page: recovery banner? A's words anywhere on screen? Then A signs in again and opens A's note in
//        a NEW tab: banner + Apply -> on the server. Storage key names are read to say where the record lives.
//   CLOSEFLY-<req|resp>-i : type words, pause 2.3 s (the pause save goes out); that save is held (req: at request stage;
//        resp: it reached the server and its response is held 4 s); the page goes to about:blank. Reopen. Manual: "Text
//        that was not yet confirmed saved when the page goes away ... is put in the kept-words box ... If it did reach
//        the server after all, the box finds it already in the note and removes itself." Read right after reopen and
//        8 s later: server count, boxes, stored kept words.
//   OFFCLOSE-i : text-save fails at the network layer; three bursts with 2.6 s pauses; network back; ' back online' +
//        2.6 s; the page goes to about:blank; reopen. Henry's bar: with a good network, closing at any time keeps
//        everything. Read: failed toasts, server before close, at close, after reopen and 8 s later, boxes.
const D_ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
const wantD = (n) => !D_ONLY || D_ONLY.some((p) => n.startsWith(p));
const REPSD = Number(process.env.REPS || 2);
const CDPD = Number(process.env.CDPPORT || 9640);
const alertsD = () => b.ev('(window.__alerts||[]).slice()').catch(() => null);
const watchND_SRC = String.raw`(()=>{const T0=performance.now();window.__toastsN=[];const seen=new WeakSet();const sel='[role=alert],[class*=toast],[class*=Toast]';const live=[];
const vis=(el)=>el.isConnected&&el.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})&&el.getBoundingClientRect().width>0;
const take=(el)=>{if(seen.has(el))return;seen.add(el);const rec={t:Math.round(performance.now()-T0),s:'',hashAt:location.hash,end:null,hashEnd:null};setTimeout(()=>{rec.s=(el.innerText||'').replace(/\s+/g,' ').trim().slice(0,90);if(rec.s){window.__toastsN.push(rec);live.push([el,rec])}},60)};
setInterval(()=>{for(const [el,rec] of live){if(rec.end===null&&!vis(el)){rec.end=Math.round(performance.now()-T0);rec.hashEnd=location.hash}}},100);
new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes){if(n.nodeType!==1)continue;if(n.matches&&n.matches(sel))take(n);if(n.querySelectorAll)for(const x of n.querySelectorAll(sel))take(x)}}).observe(document.body,{childList:true,subtree:true});1})()`;
const watchND = () => b.ev(watchND_SRC);
const toastsND = () => b.ev('(window.__toastsN||[]).slice()').catch(() => null);
const plainOf = (units) => units.map((x) => x.replace(/^\[[a-z_0-9]+\]/, ''));
const countIn = (units, s) => plainOf(units).join('|').split(s).length - 1;
const EDSD = `[...document.querySelectorAll('textarea[data-runtime-textflow-editor="true"]')].filter(e=>e.getBoundingClientRect().width>0).map(e=>{const r=e.getBoundingClientRect();return {v:e.value,x:r.left,y:r.top,w:r.width,h:r.height}})`;
const clickLineEnd = async (pred) => { const eds = await b.ev(EDSD); const e = eds.find(pred) || eds[eds.length - 1]; if (!e) return false; await b.click(e.x + Math.max(10, Math.min(e.w - 10, 300)), e.y + Math.min(e.h, 24) / 2); await sleep(300); await press('End', 'End', 35); await sleep(150); return true; };
const whereIs = async (id) => { const h = await b.ev('location.hash').catch(() => null); if (!h) return h; if (h.includes(id)) return 'A'; if (h.includes(other)) return 'other'; return h.replace(/[0-9a-f-]{36}/g, ':id'); };
const RECOVD = String.raw`(()=>{const vis=(e)=>e.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})&&e.getBoundingClientRect().width>0;
const banners=[...document.querySelectorAll('[role=alert],[role=status],[class*=toast],[class*=Toast],[class*=ecover],[class*=banner],[class*=Banner]')].filter(vis).map((x)=>x.innerText.replace(/\s+/g,' ').trim().slice(0,200)).filter(Boolean);
const apply=[...document.querySelectorAll('button')].filter(vis).some((x)=>/^apply$/i.test(x.textContent.trim()));
return {banners:[...new Set(banners)].slice(0,6),apply}})()`;
const STORE = String.raw`(()=>{const f=(s)=>Object.keys(s).filter((k)=>/recover|draft|unplaced|kept/i.test(k)).map((k)=>({k:k.slice(0,160),len:String(s.getItem(k)).length}));return {ls:f(localStorage),ss:f(sessionStorage)}})()`;
const clickApplyD = async (ev2, click2) => { const p = await ev2(`(()=>{const x=[...document.querySelectorAll('button')].find((e)=>e.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})&&/^apply$/i.test(e.textContent.trim()));if(!x)return null;const r=x.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()`).catch(() => null); if (!p) return false; await click2(p.x, p.y); return true; };
const putLinesD = () => net.filter((l) => /text-save/.test(l) && !/RESP/.test(l));
const sub = (tok) => { try { const p = JSON.parse(Buffer.from(tok.split('.')[1], 'base64url').toString('utf8')); return p.sub || p.userId || p.user_id || p.id || null; } catch { return null; } };
// A second tab over its own CDP websocket (same as the second set).
async function newTab(url) {
  const t = await b.cdp('Target.createTarget', { url: 'about:blank' });
  const id = t.result?.targetId;
  let wsUrl = null;
  for (let i = 0; i < 40 && !wsUrl; i += 1) { const l = await (await fetch(`http://127.0.0.1:${CDPD}/json/list`)).json(); wsUrl = l.find((x) => x.id === id)?.webSocketDebuggerUrl; if (!wsUrl) await sleep(150); }
  const ws = new WebSocket(wsUrl); await new Promise((r) => ws.addEventListener('open', r));
  let n = 0; const pend = new Map();
  ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } });
  const cdp2 = (method, params = {}) => new Promise((res) => { const i = ++n; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev2 = async (expression) => { const r = await cdp2('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); return r.result?.result?.value; };
  const click2 = async (x, y) => { for (const type of ['mousePressed', 'mouseReleased']) await cdp2('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 }); };
  await cdp2('Page.enable'); await cdp2('Runtime.enable');
  await cdp2('Page.navigate', { url });
  return { ev2, click2, nav: (u) => cdp2('Page.navigate', { url: u }), close: async () => { try { await b.cdp('Target.closeTarget', { targetId: id }); } catch {} try { ws.close(); } catch {} } };
}
const waitIn = async (ev2, expr, ms) => { const s = Date.now(); for (;;) { if (await ev2(expr).catch(() => false)) return Date.now() - s; if (Date.now() - s > ms) return -1; await sleep(200); } };
const HOST = `!!document.querySelector('[data-note-host-mode]')`;
// Scratch account B on this local backend only (never the island). Password random, kept in CREDROOT only.
let BACC = null;
const ensureB = async () => {
  if (BACC) return BACC;
  const p = `${ROOT}/cred-b.json`;
  if (!fs.existsSync(p)) { const c = { email: '<email>', password: randomBytes(12).toString('hex'), name: 'Verify B' }; const r = await fetch(`${API}/auth/register`, { method: 'POST', headers: J, body: JSON.stringify(c) }); if (r.status >= 300) console.log('register B', r.status); fs.writeFileSync(p, JSON.stringify(c)); }
  const c = JSON.parse(fs.readFileSync(p, 'utf8'));
  const tb = (await (await fetch(`${API}/auth/login`, { method: 'POST', headers: J, body: JSON.stringify({ email: c.email, password: c.password }) })).json()).token;
  const ab = { Authorization: `Bearer ${tb}`, ...J };
  const course = (await (await fetch(`${API}/courses`, { method: 'POST', headers: ab, body: JSON.stringify({ name: '实测·A20B', code: 'A20B', semester: 'r04' }) })).json()).id;
  const note = (await (await fetch(`${API}/notes`, { method: 'POST', headers: ab, body: JSON.stringify({ course_id: course, title: 'B own note', ...(PRESET ? { page_format: PRESET } : {}) }) })).json()).id;
  if (PRESET) await fetch(`${API}/canvas-objects/by-note/${note}/page-frame-collection`, { method: 'PUT', headers: ab, body: JSON.stringify({ collection: SEEDS[PRESET] }) });
  BACC = { tb, note, sub: sub(tb) };
  return BACC;
};
const leaveBy = async (path) => {
  if (path === 'hash') await goHash(other);
  else if (path === 'paste') { const href = await b.ev('location.href'); await b.cdp('Page.navigate', { url: href.replace(/#.*$/, `#/notes/${other}`) }); }
  else { const h = await b.cdp('Page.getNavigationHistory'); const cur = h.result.currentIndex; await b.cdp('Page.navigateToHistoryEntry', { entryId: h.result.entries[cur - 1].id }); }
};
const L = (i) => 'abcdefgh'[i % 8];

for (const path of ['hash', 'paste']) for (let i = 0; i < REPSD; i += 1) {
  const name = `HASHFAIL-${path}-${i}`; if (!wantD(name)) continue;
  await scenario(name, async () => {
    const id = await prep(`A20 hashfail ${path} ${i}`); await watch(); mark();
    const words = `hashfail ${path} words ${L(i)}`;
    rule = ({ u }) => (/text-save/.test(u) ? '500' : 'continue');
    await typeText(words, 90); await sleep(300);
    await leaveBy(path); await sleep(3500);
    const where = await whereIs(id); const alertsAway = await alertsD();
    const eds = await b.ev(EDSD).catch(() => null);
    rule = () => 'continue';
    if (where === 'A') { await blurOutside(); await sleep(3000); } else { await goHash(id); await sleep(4500); }
    const seen = await b.ev(RECOVD).catch(() => null);
    const u = await serverUnits(id);
    row(name, id, { path, words, where, stayed: where === 'A', alertsAway, stayToast: (alertsAway || []).some((a) => /could not be saved/i.test(a)), wordsInEditor: (eds || []).some((e) => e.v.includes(words)), seen, count: countIn(u, words), units: u, puts: putLinesD() }, true);
  });
}

for (let i = 0; i < REPSD; i += 1) {
  const name = `SWITCH-${i}`; if (!wantD(name)) continue;
  await scenario(name, async () => {
    const id = await prep(`A20 switch ${i}`); await watch(); mark();
    const pieces = ['one', ' two', ' three', ' four'].map((p) => `${p}${L(i)}`);
    const first = pieces[0];
    const wheres = [];
    for (let k = 0; k < pieces.length; k += 1) {
      if (k > 0 && !(await clickLineEnd((e) => e.v.startsWith(first)))) throw new Error('no line to type on');
      await typeText(pieces[k], 90); await sleep(300);
      await goHash(other); await sleep(2000); wheres.push(await whereIs(id));
      await goHash(id); await sleep(2500);
    }
    await sleep(1000);
    const al = await alertsD(); const u = await serverUnits(id);
    row(name, id, { pieces, wheres, falseToasts: (al || []).filter((a) => /could not be saved/i.test(a)).length, alerts: al, each: Object.fromEntries(pieces.map((p) => [p.trim(), countIn(u, p.trim())])), units: u, puts: putLinesD() }, true);
  });
}

for (const path of ['hash', 'paste', 'back']) for (let i = 0; i < REPSD; i += 1) {
  const name = `GONEFAIL-${path}-${i}`; if (!wantD(name)) continue;
  await scenario(name, async () => {
    const id = await prep(`A20 gonefail ${path} ${i}`);
    if (path === 'back') { await goHash(other); await sleep(1500); await goHash(id); await sleep(3000); if (!(await clickLineEnd(() => false))) throw new Error('no line'); }
    await watch(); await watchND(); mark();
    const words = `gonefail ${path} words ${L(i)}`;
    let first = true;
    rule = ({ u }) => { if (first && /text-save/.test(u)) { first = false; return 'hold'; } return 'continue'; };
    await typeText(words, 90); await sleep(300);
    await leaveBy(path); await sleep(2500);
    const whereMid = await whereIs(id);
    const rid = held.shift(); if (rid) await fail500(rid);
    await sleep(3500);
    const where = await whereIs(id); const alertsAway = await alertsD(); const toastsAway = ((await toastsND()) || []).map((x) => ({ t: x.t, s: x.s, at: x.hashAt && x.hashAt.includes(id) ? 'A' : x.hashAt, end: x.end, endAt: x.hashEnd == null ? null : x.hashEnd.includes(id) ? 'A' : x.hashEnd, stillVisibleAtRead: x.end === null, whereAtRead: where }));
    rule = () => 'continue';
    await open(id); await sleep(4000);
    const seen = await b.ev(RECOVD).catch(() => null); const bx = (await boxes().catch(() => [])).map((x) => x.v); const stored = await storedFor(id).catch(() => null);
    let applied = false;
    if (seen && seen.apply) { applied = await clickApplyD(b.ev, b.click); if (applied) { await sleep(3000); await blurOutside(); } }
    await sleep(8000);
    const u = await serverUnits(id);
    const bxEnd = (await boxes().catch(() => [])).map((x) => x.v);
    row(name, id, { path, words, heldOne: !!rid, whereMid, where, alertsAway, goneMsg: (alertsAway || []).some((a) => /did not reach the server/i.test(a)), stayMsg: (alertsAway || []).some((a) => /could not be saved/i.test(a)), goneN: toastsAway ? toastsAway.filter((x) => /did not reach the server/i.test(x.s)).length : null, stayN: toastsAway ? toastsAway.filter((x) => /could not be saved/i.test(x.s)).length : null, toastsAway, seen, boxes: bx, stored, applied, boxesEnd: bxEnd, count: countIn(u, words), units: u, puts: putLinesD() }, true);
  });
}

for (let i = 0; i < REPSD; i += 1) {
  const name = `ACCT401-${i}`; if (!wantD(name)) continue;
  await scenario(name, async () => {
    const id = await prep(`A20 acct401 ${i}`); await watch(); mark();
    const words = `acct words ${L(i)}`;
    rule = ({ u }) => (/text-save/.test(u) ? '401' : 'continue');
    await typeText(words, 90); await sleep(300); await blurOutside(); await sleep(3500);
    const whereAfter = await whereIs(id); const alertsAway = await alertsD();
    const storeA = await b.ev(STORE).catch(() => null);
    rule = () => 'continue';
    await b.cdp('Page.navigate', { url: 'about:blank' }); await sleep(1500); // this tab's page goes away
    const B = await ensureB();
    const subA = sub(token);
    // B signs in on the same browser (new tab), opens B's own note, then the home page.
    const tB = await newTab(`${ORIGIN}/#/login`); await waitIn(tB.ev2, `document.readyState==='complete'`, 20000);
    await tB.ev2(`localStorage.setItem('coincides_auth_token', ${JSON.stringify(B.tb)}); 1`);
    await tB.nav(`${ORIGIN}/?r=${Date.now()}#/notes/${B.note}`); await waitIn(tB.ev2, HOST, 30000); await sleep(3500);
    const seenBnote = await tB.ev2(RECOVD); const wordsOnBnote = await tB.ev2(`document.body.innerText.includes(${JSON.stringify(words)})`);
    const storeB = await tB.ev2(STORE);
    await tB.ev2(`location.hash='#/'; 1`); await sleep(3500);
    const seenBhome = await tB.ev2(RECOVD); const wordsOnBhome = await tB.ev2(`document.body.innerText.includes(${JSON.stringify(words)})`); const bHomeWhere = await tB.ev2('location.hash');
    await tB.close();
    // A signs in again; A's note in a NEW tab.
    const fresh2 = await (await fetch(`${API}/auth/login`, { method: 'POST', headers: J, body: JSON.stringify({ email, password }) })).json();
    const tA = await newTab(`${ORIGIN}/#/login`); await waitIn(tA.ev2, `document.readyState==='complete'`, 20000);
    await tA.ev2(`localStorage.setItem('coincides_auth_token', ${JSON.stringify(fresh2.token)}); 1`);
    await tA.nav(`${ORIGIN}/?r=${Date.now()}#/notes/${id}`); await waitIn(tA.ev2, HOST, 30000); await sleep(3500);
    const seenA = await tA.ev2(RECOVD);
    const applied = await clickApplyD(tA.ev2, tA.click2);
    if (applied) { await sleep(3000); await tA.click2(1380, 300); await sleep(3000); }
    await tA.close();
    const u = await serverUnits(id);
    const keyNames = (s) => (s ? [...s.ls, ...s.ss].map((x) => ({ ...x, k: x.k.replace(subA || '@@', ':userA').replace(B.sub || '@@', ':userB').replace(id, ':noteA').replace(/[0-9a-f-]{36}/g, ':id') })) : null);
    row(name, id, { words, whereAfter, alertsAway, storeA: keyNames(storeA), storeB: keyNames(storeB), seenBnote, wordsOnBnote, seenBhome, wordsOnBhome, bHomeWhere, seenA, applied, count: countIn(u, words), units: u, puts: putLinesD() }, true);
  });
}

for (const how of ['req', 'resp']) for (let i = 0; i < REPSD; i += 1) {
  const name = `CLOSEFLY-${how}-${i}`; if (!wantD(name)) continue;
  await scenario(name, async () => {
    const id = await prep(`A20 closefly ${how} ${i}`); await watch(); mark();
    const words = `closefly ${how} words ${L(i)}`;
    let n = 0;
    if (how === 'req') rule = ({ u }) => (/text-save/.test(u) && n++ === 0 ? 'hold' : 'continue');
    else respRule = ({ u }) => (/text-save/.test(u) && n++ === 0 ? { delay: 4000 } : null);
    await typeText(words, 90); await sleep(2300);
    const sentBeforeClose = putLinesD().length;
    await b.cdp('Page.navigate', { url: 'about:blank' }); await sleep(1500);
    rule = () => 'continue'; respRule = () => null; await release(); await sleep(3000);
    const atClose = await serverUnits(id);
    await open(id); await sleep(3000);
    const bx0 = (await boxes().catch(() => [])).map((x) => x.v); const st0 = await storedFor(id).catch(() => null); const seen0 = await b.ev(RECOVD).catch(() => null);
    await sleep(8000);
    const bx1 = (await boxes().catch(() => [])).map((x) => x.v); const st1 = await storedFor(id).catch(() => null);
    const u = await serverUnits(id);
    row(name, id, { how, words, sentBeforeClose, countAtClose: countIn(atClose, words), boxes0: bx0, stored0: st0, seen0, boxes1: bx1, stored1: st1, count: countIn(u, words), inBox: [...bx0, ...bx1].some((v) => v.includes(words)), units: u, puts: putLinesD() }, true);
  });
}

for (let i = 0; i < REPSD; i += 1) {
  const name = `OFFCLOSE-${i}`; if (!wantD(name)) continue;
  await scenario(name, async () => {
    const id = await prep(`A20 offclose ${i}`); await watch(); mark();
    rule = ({ u }) => (/text-save/.test(u) ? 'neterr' : 'continue');
    for (const w of ['one burst', ' two burst', ' three burst']) { await typeText(w, 90); await sleep(2600); }
    const alertsOff = await alertsD();
    rule = () => 'continue';
    await typeText(' back online', 90); await sleep(2600);
    const all = 'one burst two burst three burst back online';
    const before = await serverUnits(id);
    await b.cdp('Page.navigate', { url: 'about:blank' }); await sleep(2500);
    const atClose = await serverUnits(id);
    await open(id); await sleep(3000);
    const bx0 = (await boxes().catch(() => [])).map((x) => x.v); const seen0 = await b.ev(RECOVD).catch(() => null);
    await sleep(8000);
    const bx1 = (await boxes().catch(() => [])).map((x) => x.v);
    const u = await serverUnits(id);
    row(name, id, { failedToasts: (alertsOff || []).filter((a) => /failed to save/i.test(a)).length, alertsOff, countBeforeClose: countIn(before, all), countAtClose: countIn(atClose, all), boxes0: bx0, seen0, boxes1: bx1, count: countIn(u, all), inBox: [...bx0, ...bx1].some((v) => v.includes('back online')), units: u, puts: putLinesD() }, true);
  });
}

fs.writeFileSync(`${OUT}/summary.json`, JSON.stringify({ total: rows.length }, null, 1));
console.log(`DONE ${LABEL}: ${rows.length} rows`);
log.end(); await b.close(); process.exit(0);
